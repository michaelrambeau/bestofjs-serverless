import dotEnv from "dotenv";
import debugModule from "debug";
import mongoose from "mongoose";
import { flattenDeep } from "lodash";

import models from "./_models";
import { getMonthlyTrends } from "./_project_details/snapshots";
const ObjectId = mongoose.Types.ObjectId;

dotEnv.config({ silent: true });
mongoose.Promise = global.Promise;
const debug = debugModule("api");

// Create cached connection variable, see https://vercel.com/guides/deploying-a-mongodb-powered-api-with-node-and-vercel
let cachedDb = null;

export default async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    await connectToDatabase();
    const { fullName } = req.query;
    const project = await findProject(fullName);
    res.json(project);
  } catch (error) {
    console.error(error);
    res.json({ status: "ERROR", message: error.message });
  }
};

async function connectToDatabase() {
  if (cachedDb) {
    debug("DB connection is cached");
    return cachedDb;
  }
  const dbEnv = process.env.DB_ENV || "DEV";
  const key = `MONGO_URI_${dbEnv.toUpperCase()}`;
  const uri = process.env[key];
  if (!uri) throw new Error(`No env. variable '${key}'`);
  debug("No cached connection, connecting to the DB", `${uri.slice(0, 15)}...`);
  cachedDb = await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  debug("Connected");
}

async function findProject(fullName) {
  const query = { "github.full_name": fullName };
  const project = await models.Project.findOne(query).populate("tags");
  if (!project) throw new Error(`Project not found '${fullName}'`);

  const starCollection = models.Snapshot.collection;
  const snapshots = await findAllSnapshots(starCollection, project._id);
  const monthly = getMonthlyTrends(snapshots, new Date());

  project.timeSeries = { monthly };

  return convertProject(project);
}

function convertProject(project) {
  const description = project.getDescription();
  const {
    github,
    npm,
    bundle,
    packageSize,
    name,
    icon,
    tags,
    timeSeries,
  } = project;

  const result = {
    name,
    description,
    github,
    npm,
    icon: icon ? icon.url : null,
    bundle,
    packageSize,
    tags: tags.map((tag) => tag.code),
    timeSeries,
  };
  return result;
}

type SnapshotMonth = {
  year: number;
  month: number;
};
type SnapshotDay = SnapshotMonth & {
  day: number;
};
type Snapshot = SnapshotDay & {
  stars: number;
};

async function findAllSnapshots(collection, projectId: string): Snapshot[] {
  const docs = await fetchAllDocuments(collection, projectId);
  if (!docs) return [];
  return flattenDeep(
    docs.map(({ year, months }) =>
      months.map(({ month, snapshots }) =>
        snapshots.map(({ day, stars }) => ({ year, month, day, stars }))
      )
    )
  );
}

async function fetchAllDocuments(collection, projectId) {
  debug("Fetching snapshots", projectId);
  const docs = await collection
    .find({ project: ObjectId(projectId) })
    .sort({ year: 1 })
    .toArray();
  debug(
    docs.length
      ? `${docs.length} snapshot documents found`
      : "No snapshot documents found"
  );
  return docs;
}
