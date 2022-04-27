import dotEnv from "dotenv";
import debugModule from "debug";
import mongoose from "mongoose";

import models from "./_models";

dotEnv.config({ silent: true });
mongoose.Promise = global.Promise;
const debug = debugModule("api");

// Create cached connection variable, see https://vercel.com/guides/deploying-a-mongodb-powered-api-with-node-and-vercel
let cachedDb = null;

export default async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    await connectToDatabase();
    const { fullNames } = req.query;
    const projectFullNames = fullNames.split(",");
    const results = await fetchAllProjects(projectFullNames);
    res.json(results);
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

async function fetchAllProjects(projectFullNames: string[]) {
  return Promise.all(projectFullNames.map(findProject));
}

async function findProject(fullName) {
  const query = { "github.full_name": fullName };
  const project = await models.Project.findOne(query).populate("tags");
  if (!project) throw new Error(`Project not found '${fullName}'`);

  return convertProject(project);
}

function convertProject(project) {
  const description = project.getDescription();
  const { github, npm, bundle, packageSize, name, icon, tags } = project;

  const result = {
    name,
    description,
    github,
    npm,
    icon: icon ? icon.url : null,
    bundle,
    packageSize,
    tags: tags.map((tag) => tag.code),
  };
  return result;
}
