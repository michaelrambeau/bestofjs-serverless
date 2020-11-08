import { groupBy, flattenDeep, orderBy, takeRight } from "lodash";
import mongoose from "mongoose";
import { DateTime } from "luxon";
import { produce } from "immer";
import debugModule from "debug";

const ObjectId = mongoose.Types.ObjectId;
const debug = debugModule("star-storage");

export function createStarStorage(collection) {
  async function getDocuments(projectId) {
    debug("Finding all snapshot documents...");
    const docs = await collection
      .find({ project: ObjectId(projectId) })
      .sort({ year: 1 })
      .toArray();
    debug(docs.length ? `${docs.length} docs found` : "No docs found");
    return docs;
  }

  async function getDocumentByYear(projectId, year) {
    debug("Finding snapshot document for year", year);
    const doc = await collection.findOne({
      project: ObjectId(projectId),
      year,
    });
    return doc;
  }

  async function update(projectId, year, months) {
    if (!Array.isArray(months))
      throw new Error(
        'Unable to update the snapshots, "months" should not an array'
      );
    const query = { project: ObjectId(projectId), year };
    debug("Updating...", months[months.length - 1]);
    const { result } = await collection.updateOne(
      query,
      {
        $set: { months, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },

      { upsert: true }
    );
    const { ok, nModified, upserted } = result;
    if (upserted) {
      debug("Snapshot document created");
    }
    if (nModified === 1) {
      debug("Snapshot document updated");
    }
    return ok === 1;
  }

  async function addSnapshot(
    projectId,
    stars,
    { year, month, day } = normalizeDate(new Date())
  ) {
    const doc = await getDocumentByYear(projectId, year);

    const currentMonths = doc ? doc.months : [];
    const updatedMonths = produce(currentMonths, (months) => {
      const monthItem = months.find(findByMonth(month));
      if (!monthItem) {
        months.push({ month, snapshots: [{ day, stars }] });
      } else {
        const existingSnapshot = monthItem.snapshots.find(findByDay(day));
        if (existingSnapshot) return false;
        monthItem.snapshots.push({ day, stars });
      }
    });

    if (updatedMonths === false) {
      debug(
        `No snapshot to add, a snapshot already exists for this day (${day})`
      );
      return false;
    }
    await update(projectId, year, updatedMonths);
    return true;
  }

  const findByMonth = (month) => (item) => item.month === month;
  const findByDay = (day) => (item) => item.day === day;

  async function getAllSnapshots(projectId) {
    const docs = await getDocuments(projectId);
    if (!docs) return [];
    return flattenDeep(
      docs.map(({ year, months }) =>
        months.map(({ month, snapshots }) =>
          snapshots.map(({ day, stars }) => ({ year, month, day, stars }))
        )
      )
    );
  }

  return {
    addSnapshot,

    getAllSnapshots,

    async getTrends(projectId) {
      const snapshots = await getAllSnapshots(projectId);
      const trends = computeTrends(snapshots);
      return trends;
    },

    async getTimeSeries(projectId) {
      const currentDate = normalizeDate(new Date());
      const snapshots = await getAllSnapshots(projectId);
      const daily = computeDailyTrends(snapshots);
      const monthly = computeMonthlyTrends(snapshots, { currentDate });
      return {
        daily,
        monthly,
      };
    },
  };
}

function diffDay(snapshot1, snapshot2) {
  const d1 = toDate(snapshot1);
  const d2 = toDate(snapshot2);

  return (d1 - d2) / 1000 / 3600 / 24;
}

function toDate({ year, month, day }) {
  return new Date(year, month - 1, day);
}

export function normalizeDate(date) {
  const dt = DateTime.fromJSDate(date).setZone("Asia/Tokyo");
  const year = dt.year;
  const month = dt.month;
  const day = dt.day;
  return { year, month, day };
}

export function computeTrends(snapshots) {
  snapshots.reverse();
  const mostRecentSnapshot = snapshots[0];

  const findSnapshotDaysAgo = (days) =>
    snapshots.find((snapshot) => diffDay(mostRecentSnapshot, snapshot) >= days);

  const getDelta = (days) => {
    const snapshot = findSnapshotDaysAgo(days);
    if (!snapshot) return undefined;
    return mostRecentSnapshot.stars - snapshot.stars;
  };

  return {
    daily: getDelta(1),
    weekly: getDelta(7),
    monthly: getDelta(30),
    quarterly: getDelta(90),
    yearly: getDelta(365),
  };
}

export function computeDailyTrends(snapshots, { count = 366 } = {}) {
  if (snapshots.length === 0) return [];
  snapshots = takeRight(orderBy(snapshots, toDate, "asc"), count);

  const value0 = snapshots[0].stars;
  return snapshots.slice(1).reduce(
    (acc, snapshot) => {
      return {
        deltas: acc.deltas.concat(snapshot.stars - acc.previous),
        previous: snapshot.stars,
      };
    },
    { deltas: [], previous: value0 }
  ).deltas;
}

export function computeMonthlyTrends(
  snapshots,
  { count = 12, currentDate } = {}
) {
  if (snapshots.length === 0) return [];
  const total = (count + 1) * 31;
  snapshots = takeRight(orderBy(snapshots, toDate, "asc"), total);

  const grouped = groupBy(snapshots, ({ year, month }) => `${year}/${month}`);

  return Object.values(grouped)
    .map((group) => {
      const firstSnapshot = group[0];
      const lastSnapshot = group[group.length - 1];
      const { year, month, stars, day } = firstSnapshot;
      return {
        year,
        month,
        firstDay: day,
        lastDay: lastSnapshot.day,
        delta: lastSnapshot.stars - stars,
      };
    })
    .filter(
      ({ year, month }) =>
        !(month === currentDate.month && year === currentDate.year)
    );
}
