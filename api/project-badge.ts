import debugModule from "debug";
import fetch from "node-fetch";
import { NowRequest, NowResponse } from "@now/node";

const debug = debugModule("*");

const periods = {
  daily: "today",
  weekly: "this week",
  monthly: "this month",
  yearly: "this year",
};

export default async (req: NowRequest, res: NowResponse) => {
  try {
    const { fullName, since } = parseQueryParams(req);
    if (!fullName) throw new Error(`No "fullName" query parameter provided!`);

    const data = await fetchProjectData(fullName);

    const label = `Best of JS`;
    const message = data ? getMessage(data, since) : "No data";

    const output = {
      schemaVersion: 1,
      label,
      message: message,
      color: "orange",
    };
    debug(`Sending ${fullName}`, output);
    res.send(output);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

async function fetchProjectData(fullName) {
  const url = "https://bestofjs-static-api.now.sh/projects.json";
  const data = await fetch(url).then((r) => r.json());
  const projectData = data.projects.find(
    (project) => project.full_name === fullName
  );
  return projectData;
}

function getMessage(data, since) {
  const delta = data.trends[since];
  if (delta === undefined) return `Data not available`;
  const prefix = delta > 0 ? "+" : "";
  const displayValue = delta ? `${prefix}${delta} ★` : `No star added`;
  const message = `${displayValue} ${periods[since]}`;
  return message;
}

function parseQueryParams(req: NowRequest) {
  const query = req.query;
  const fullName = query.fullName || query.fullname;
  const sinceParam = query.since;
  const since = Object.keys(periods).includes(sinceParam)
    ? sinceParam
    : "daily";
  return { fullName, since };
}
