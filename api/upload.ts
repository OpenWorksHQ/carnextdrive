import {
  uploadHandler,
  uploadMiddleware,
} from "../server/routes/notifications";
import { invoke, runMiddleware, setCors } from "../server/vercel";

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    await runMiddleware(uploadMiddleware, req, res);
    if (!res.headersSent && !res.writableEnded) {
      await invoke(uploadHandler, req, res);
    }
  } catch (error: any) {
    console.error("[upload] middleware error:", error?.message || error);
    return res.status(500).json({ error: error?.message || "Upload failed" });
  }
}
