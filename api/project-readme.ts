import prettyBytes from "pretty-bytes";
import debugModule from "debug";
import { NowRequest, NowResponse } from "@now/node";

import { fetchReadme } from "./_fetch-readme/fetch-github-readme";

const debug = debugModule("*");

export default async (req: NowRequest, res: NowResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const credentials = {
    username: process.env.GITHUB_USERNAME,
    client_id: process.env.GITHUB_CLIENT_ID,
    client_secret: process.env.GITHUB_CLIENT_SECRET
  };

  const { fullName, branch } = req.query;
  if (!fullName) throw new Error(`No "fullName" query parameter provided!`);
  try {
    const readme = await fetchReadme({
      repo: fullName,
      branch: branch as string,
      credentials
    });
    debug(`Sending ${fullName} README.md ${prettyBytes(readme.length)}`);
    res.send(readme);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
