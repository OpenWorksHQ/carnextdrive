import express from "express";
import cors from "cors";
import {
  uploadHandler,
  uploadMiddleware,
} from "../server/routes/notifications";

const app = express();
app.use(cors());
app.post("*", uploadMiddleware, uploadHandler);

export default app;
