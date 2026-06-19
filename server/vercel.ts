import type { RequestHandler } from "express";

export function createJsonFunction(
  method: "get" | "post" | "put" | "delete",
  handler: RequestHandler,
) {
  return async (req: any, res: any) => {
    setCors(res);
    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method?.toLowerCase() !== method) {
      res.setHeader("Allow", method.toUpperCase());
      return res.status(405).json({ error: "Method not allowed" });
    }
    return invoke(handler, req, res);
  };
}

export function createRawFunction(handler: RequestHandler) {
  return async (req: any, res: any) => {
    setCors(res);
    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).send("Method not allowed");
    }
    return invoke(handler, req, res);
  };
}

export function setCors(res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Stripe-Signature",
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
}

export function invoke(handler: RequestHandler, req: any, res: any) {
  return new Promise<void>((resolve, reject) => {
    const next = (error?: unknown) => {
      if (error) reject(error);
      else resolve();
    };
    try {
      Promise.resolve(handler(req, res, next)).then(resolve, reject);
    } catch (error) {
      reject(error);
    }
  });
}

export function runMiddleware(
  middleware: RequestHandler,
  req: any,
  res: any,
) {
  return new Promise<void>((resolve, reject) => {
    try {
      middleware(req, res, (error?: unknown) => {
        if (error) reject(error);
        else resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
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
