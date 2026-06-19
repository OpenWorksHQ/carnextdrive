import { getCheckoutStatus } from "../../server/routes/stripe.js";

export default function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  req.params = { ...req.params, sessionId: String(req.query.sessionId || "") };
  return getCheckoutStatus(req, res, () => undefined);
}
