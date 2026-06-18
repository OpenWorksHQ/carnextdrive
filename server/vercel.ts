import "dotenv/config";
import express, { RequestHandler } from "express";
import cors from "cors";

export function createJsonFunction(
  method: "get" | "post" | "put" | "delete",
  handler: RequestHandler,
) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "4mb" }));
  app.use(express.urlencoded({ extended: true, limit: "4mb" }));
  app[method]("*", handler);
  return app;
}

export function createRawFunction(handler: RequestHandler) {
  const app = express();
  app.use(cors());
  app.post("*", express.raw({ type: "application/json", limit: "4mb" }), handler);
  return app;
}

export function withRouteParam(
  name: string,
  handler: RequestHandler,
): RequestHandler {
  return (req, res, next) => {
    const value = req.query[name];
    req.params[name] = Array.isArray(value)
      ? String(value[0] ?? "")
      : String(value ?? "");
    return handler(req, res, next);
  };
}
