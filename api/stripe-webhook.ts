import { stripeWebhook } from "../server/routes/stripe.js";

export default function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method not allowed");
  }
  return stripeWebhook(req, res, () => undefined);
}
