import { adminLogin } from "../../server/routes/admin";

export default function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  return adminLogin(req, res, () => undefined);
}
