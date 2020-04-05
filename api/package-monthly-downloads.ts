import { DateTime } from "luxon";
import fetch from "node-fetch";
import { groupBy, mapValues } from "lodash";
import debugModule from "debug";
import { NowRequest, NowResponse } from "@now/node";

const debug = debugModule("api");

type DownloadInput = {
  download: number;
  day: string; // yyyy-MM-dd format
};
type DownloadOutput = {
  download: number;
  year: number;
  month: number;
  day: number;
};

export default async (req: NowRequest, res: NowResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const { packageName } = req.query;
    if (!packageName) throw new Error(`No "packageName" query parameter`);
    const values = await fetchMonthDownloadData(packageName);
    res.json(values);
  } catch (error) {
    res.json({ status: "ERROR", message: error.message });
  }
};

async function fetchMonthDownloadData(packageName) {
  const today = new Date();
  const { startDate, endDate } = getIntervalDates(today);
  const rangeParam = `${formatDateTime(startDate)}:${formatDateTime(endDate)}`;
  const url = `https://api.npmjs.org/downloads/range/${rangeParam}/${packageName}`;
  debug("Fetch downloads for the range", rangeParam);
  const data = await fetch(url).then((res) => res.json());
  const byMonth = groupByMonth(data.downloads);
  debug(byMonth);
  return byMonth;
}

function getIntervalDates(date) {
  const dt = DateTime.fromObject({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: 1,
  });

  const startDate = dt.minus({ year: 1 });
  const endDate = dt.minus({ days: 1 });

  return {
    startDate,
    endDate,
  };
}

function formatDateTime(dt) {
  return dt.toFormat("yyyy-MM-dd");
}

function groupByMonth(downloadData: DownloadInput[]): DownloadOutput {
  const byMonth = groupBy(downloadData, ({ day }) => {
    const monthKey = day.slice(0, 7);
    return monthKey;
  });
  const totalsByMonth = mapValues(byMonth, (value) => {
    const reducer = (acc, { downloads }) => acc + downloads;
    return value.reduce(reducer, 0);
  });
  const result = Object.keys(totalsByMonth).map((key) => ({
    year: parseInt(key.slice(0, 4)),
    month: parseInt(key.slice(5, 7)),
    downloads: totalsByMonth[key],
  }));
  return result;
}
