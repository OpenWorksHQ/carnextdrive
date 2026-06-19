import { createCheckoutSession } from "../server/routes/stripe.js";

export default function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  return createCheckoutSession(req, res, () => undefined);
}
