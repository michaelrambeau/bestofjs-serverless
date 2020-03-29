import { NowRequest, NowResponse } from "@now/node";

export default (req: NowRequest, res: NowResponse) => {
  const { query } = req;
  res.json({ message: "pong", query });
};
