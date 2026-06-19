import {
  deleteCar,
  requireAdmin,
  updateCar,
} from "../../../server/routes/admin";
import {
  invoke,
  setCors,
  withRouteParam,
} from "../../../server/vercel";

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  const endpoint =
    req.method === "PUT"
      ? updateCar
      : req.method === "DELETE"
        ? deleteCar
        : null;
  if (!endpoint) {
    res.setHeader("Allow", "PUT, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  }
  await invoke(requireAdmin, req, res);
  if (!res.headersSent && !res.writableEnded) {
    return invoke(withRouteParam("id", endpoint), req, res);
  }
}
