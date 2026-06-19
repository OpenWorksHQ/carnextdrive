import {
  uploadHandler,
  uploadMiddleware,
} from "../server/routes/notifications.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    await new Promise<void>((resolve, reject) => {
      uploadMiddleware(req, res, (error?: unknown) => {
        if (error) reject(error);
        else resolve();
      });
    });
    if (!res.headersSent && !res.writableEnded) {
      await uploadHandler(req, res, () => undefined);
    }
  } catch (error: any) {
    console.error("[upload] middleware error:", error?.message || error);
    return res.status(500).json({ error: error?.message || "Upload failed" });
  }
}
