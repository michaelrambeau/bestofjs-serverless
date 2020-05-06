import dotEnv from "dotenv";
import debugModule from "debug";
import mongoose from "mongoose";

import { createStarStorage } from "./_project_details/star-storage";
import models from "./_models";

dotEnv.config({ silent: true });
mongoose.Promise = global.Promise;
const debug = debugModule("api");

export default async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    await connect();
    const { fullName } = req.query;
    const project = await findProject(fullName);
    res.json(project);
  } catch (error) {
    res.json({ status: "ERROR", message: error.message });
  }
};

async function connect() {
  const dbEnv = process.env.DB_ENV || "DEV";
  const key = `MONGO_URI_${dbEnv.toUpperCase()}`;
  const uri = process.env[key];
  if (!uri) throw new Error(`No env. variable '${key}'`);
  debug("Connecting", `${uri.slice(0, 12)}...`);
  await mongoose.connect(uri, {
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
  const storage = createStarStorage(starCollection);

  const { daily, monthly } = await storage.getTimeSeries(project._id);

  debug(`${daily.length} daily trends found`, daily.slice(daily.length - 7));
  project.timeSeries = { daily, monthly };

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
