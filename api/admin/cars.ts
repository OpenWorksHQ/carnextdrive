import express from "express";
import cors from "cors";
import {
  createCar,
  listCars,
  requireAdmin,
} from "../../server/routes/admin";

const app = express();
app.use(cors());
app.use(express.json({ limit: "4mb" }));
app.get("*", requireAdmin, listCars);
app.post("*", requireAdmin, createCar);

export default app;
