import {
  createCar,
  listCars,
  requireAdmin,
} from "../../server/routes/admin";
import { invoke, setCors } from "../../server/vercel";

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  const endpoint =
    req.method === "GET"
      ? listCars
      : req.method === "POST"
        ? createCar
        : null;
  if (!endpoint) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  await invoke(requireAdmin, req, res);
  if (!res.headersSent && !res.writableEnded) {
    return invoke(endpoint, req, res);
  }
}
