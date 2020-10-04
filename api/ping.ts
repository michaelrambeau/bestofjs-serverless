import { NowRequest, NowResponse } from "@now/node";

import packageJSON from "../package.json";

export default (req: NowRequest, res: NowResponse) => {
  const { query } = req;
  res.json({ message: "pong", query, version: packageJSON.version });
};
