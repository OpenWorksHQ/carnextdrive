import { getStoreHealth } from "../server/catalog/store";
import { createJsonFunction } from "../server/vercel";

export default createJsonFunction("get", async (_req, res) => {
  try {
    res.json(await getStoreHealth());
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "health check failed" });
  }
});
