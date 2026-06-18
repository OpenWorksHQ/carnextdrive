import { createJsonFunction } from "../server/vercel";

export default createJsonFunction("get", (_req, res) => {
  res.json({ message: process.env.PING_MESSAGE ?? "ping" });
});
