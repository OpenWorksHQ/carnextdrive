import express from "express";
import cors from "cors";
import {
  deleteCar,
  requireAdmin,
  updateCar,
} from "../../../server/routes/admin";
import { withRouteParam } from "../../../server/vercel";

const app = express();
app.use(cors());
app.use(express.json({ limit: "4mb" }));
app.put("*", requireAdmin, withRouteParam("id", updateCar));
app.delete("*", requireAdmin, withRouteParam("id", deleteCar));

export default app;
