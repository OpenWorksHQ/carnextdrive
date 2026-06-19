import {
  createCar,
  listCars,
  requireAdmin,
} from "../../server/routes/admin";

export default async function handler(req: any, res: any) {
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
  let authorized = false;
  requireAdmin(req, res, () => {
    authorized = true;
  });
  if (!authorized || res.headersSent || res.writableEnded) return;
  return endpoint(req, res, () => undefined);
}
