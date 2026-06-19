import { notifyHandler } from "../../server/routes/notifications";

export default function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  req.params = { ...req.params, sessionId: String(req.query.sessionId || "") };
  return notifyHandler(req, res, () => undefined);
}
