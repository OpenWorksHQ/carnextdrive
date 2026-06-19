import { getCarPricing } from "../server/routes/stripe";

export default function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  return getCarPricing(req, res, () => undefined);
}
