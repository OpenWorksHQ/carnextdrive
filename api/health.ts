import { getStoreHealth } from "../server/catalog/store";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    res.json(await getStoreHealth());
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "health check failed" });
  }
}
