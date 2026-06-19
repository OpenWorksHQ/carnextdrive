import {
  createCar,
  deleteCar,
  listCars,
  requireAdmin,
  updateCar,
} from "../../server/routes/admin.js";

export default async function handler(req: any, res: any) {
  const endpoint =
    req.method === "GET"
      ? listCars
      : req.method === "POST"
        ? createCar
        : req.method === "PUT"
          ? updateCar
          : req.method === "DELETE"
            ? deleteCar
            : null;
  if (!endpoint) {
    res.setHeader("Allow", "GET, POST, PUT, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  }
  let authorized = false;
  requireAdmin(req, res, () => {
    authorized = true;
  });
  if (!authorized || res.headersSent || res.writableEnded) return;
  if (req.method === "PUT" || req.method === "DELETE") {
    req.params = { ...req.params, id: String(req.query.id || "") };
  }
  return endpoint(req, res, () => undefined);
}
