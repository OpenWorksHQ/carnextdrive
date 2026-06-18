import path from "path";
import "dotenv/config";
import * as express from "express";
import express__default from "express";
import cors from "cors";
import Stripe from "stripe";
import multer from "multer";
import { v2 } from "cloudinary";
import { promises } from "fs";
import { Pool } from "pg";
import crypto from "crypto";
import { z } from "zod";
const handleDemo = (req, res) => {
  const response = {
    message: "Hello from Express server"
  };
  res.status(200).json(response);
};
function configureCloudinary() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret) {
    return false;
  }
  v2.config({ cloud_name, api_key, api_secret, secure: true });
  return true;
}
const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
  // 10 MB per file
}).fields([
  { name: "license", maxCount: 1 },
  { name: "id", maxCount: 1 }
]);
function uploadBufferToCloudinary(buffer, publicIdPrefix) {
  return new Promise((resolve, reject) => {
    const stream = v2.uploader.upload_stream(
      {
        folder: "carnextdrive-applications",
        public_id: publicIdPrefix,
        resource_type: "auto",
        overwrite: false
      },
      (err, result) => {
        if (err || !result) return reject(err || new Error("upload failed"));
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}
const uploadHandler = async (req, res) => {
  try {
    if (!configureCloudinary()) {
      return res.status(500).json({
        error: "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET."
      });
    }
    const files = req.files;
    const licenseFile = files?.license?.[0];
    const idFile = files?.id?.[0];
    if (!licenseFile && !idFile) {
      return res.status(400).json({ error: "No files provided" });
    }
    const stamp = Date.now();
    let licenseUrl = null;
    let idUrl = null;
    if (licenseFile) {
      const r = await uploadBufferToCloudinary(
        licenseFile.buffer,
        `license-${stamp}`
      );
      licenseUrl = r.secure_url;
    }
    if (idFile) {
      const r = await uploadBufferToCloudinary(idFile.buffer, `id-${stamp}`);
      idUrl = r.secure_url;
    }
    return res.json({ licenseUrl, idUrl });
  } catch (err) {
    console.error("[upload] error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Upload failed" });
  }
};
const notifiedSessions = /* @__PURE__ */ new Set();
const DATA_DIR$1 = process.env.LAMBDA_TASK_ROOT ? "/tmp/carnextdrive-data" : path.join(process.cwd(), ".data");
const LOG_PATH = path.join(DATA_DIR$1, "applications.jsonl");
async function loadNotifiedFromDisk() {
  try {
    const raw = await promises.readFile(LOG_PATH, "utf8");
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        if (entry?.sessionId) notifiedSessions.add(entry.sessionId);
      } catch {
      }
    }
    console.log(
      `[notify] loaded ${notifiedSessions.size} previously-notified session ids from disk`
    );
  } catch {
  }
}
void loadNotifiedFromDisk();
async function appendApplicationLog(payload) {
  try {
    await promises.mkdir(DATA_DIR$1, { recursive: true });
    await promises.appendFile(
      LOG_PATH,
      JSON.stringify({ ts: (/* @__PURE__ */ new Date()).toISOString(), ...payload }) + "\n",
      "utf8"
    );
  } catch (err) {
    console.warn("[notify] failed to append local log:", err);
  }
}
async function summarizeSession(stripe, session) {
  const md = session.metadata || {};
  let subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id || "";
  return {
    sessionId: session.id,
    customerEmail: session.customer_details?.email || session.customer_email || "",
    customerName: md.customerName || session.customer_details?.name || "",
    phone: md.phone || session.customer_details?.phone || "",
    carId: md.carId || "",
    carName: md.carName || "",
    plan: md.plan || "",
    selectedPrice: md.plan === "weekly" ? `$${(session.amount_total ?? 0) / 100} / week` : md.plan === "monthly" ? `$${(session.amount_total ?? 0) / 100} / month` : `${(session.amount_total ?? 0) / 100} ${session.currency || ""}`,
    licenseUrl: md.licenseUrl || "",
    idUrl: md.idUrl || "",
    amountPaid: ((session.amount_total ?? 0) / 100).toFixed(2),
    currency: (session.currency || "").toUpperCase(),
    stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id || "",
    subscriptionId: subId
  };
}
async function sendFormspree(summary) {
  const endpoint = process.env.FORMSPREE_ENDPOINT;
  if (!endpoint) {
    return { ok: false, status: 0, body: "FORMSPREE_ENDPOINT not set" };
  }
  const message = [
    `New CarNextDrive rental application:`,
    ``,
    `Customer: ${summary.customerName}`,
    `Email: ${summary.customerEmail}`,
    `Phone: ${summary.phone}`,
    ``,
    `Vehicle: ${summary.carName}`,
    `Plan: ${summary.plan} (${summary.selectedPrice})`,
    `Initial payment: $${summary.amountPaid} ${summary.currency}`,
    ``,
    `Driver license: ${summary.licenseUrl || "(not uploaded)"}`,
    `ID document:    ${summary.idUrl || "(not uploaded)"}`,
    ``,
    `Stripe session:      ${summary.sessionId}`,
    `Stripe customer:     ${summary.stripeCustomerId}`,
    `Stripe subscription: ${summary.subscriptionId}`,
    ``,
    `Review and approve at https://dashboard.stripe.com/test/subscriptions/${summary.subscriptionId}`
  ].join("\n");
  const form = new URLSearchParams();
  form.set("name", summary.customerName);
  form.set("email", summary.customerEmail);
  form.set("phone", summary.phone);
  form.set("message", message);
  form.set("_subject", `New CarNextDrive application — ${summary.carName}`);
  form.set("_gotcha", "");
  form.set("vehicle", summary.carName);
  form.set("plan", summary.plan);
  form.set("selected_price", summary.selectedPrice);
  form.set("license_url", summary.licenseUrl || "");
  form.set("id_url", summary.idUrl || "");
  form.set("stripe_session_id", summary.sessionId);
  form.set("stripe_customer_id", summary.stripeCustomerId);
  form.set("stripe_subscription_id", summary.subscriptionId);
  const origin = process.env.PUBLIC_SITE_URL || process.env.URL || // Netlify sets this
  "https://carnextdrive.com";
  const r = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      // Pretend to be a real browser. Default Node UA gets penalised.
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Origin: origin,
      Referer: `${origin}/signup`
    },
    body: form.toString()
  });
  const body = await r.text().catch(() => "");
  return { ok: r.ok, status: r.status, body };
}
async function notifyForSession(stripe, session) {
  if (notifiedSessions.has(session.id)) {
    return { skipped: true, ok: true, detail: "already notified" };
  }
  if (session.status !== "complete" || session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    return {
      skipped: true,
      ok: false,
      detail: `not paid yet (status=${session.status}, payment_status=${session.payment_status})`
    };
  }
  const summary = await summarizeSession(stripe, session);
  await appendApplicationLog(summary);
  const fr = await sendFormspree(summary);
  if (!fr.ok) {
    console.error(
      "[notify] Formspree failed:",
      fr.status,
      fr.body.slice(0, 300)
    );
    notifiedSessions.add(session.id);
    return {
      skipped: false,
      ok: false,
      detail: `formspree returned ${fr.status}: ${fr.body.slice(0, 200)}`
    };
  }
  notifiedSessions.add(session.id);
  console.log("[notify] Formspree sent for session", session.id);
  return { skipped: false, ok: true, detail: "sent" };
}
async function notifyFromWebhook(session) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return;
  const stripe = new Stripe(key);
  try {
    const full = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["subscription", "customer"]
    });
    const result = await notifyForSession(stripe, full);
    console.log("[notify] webhook result:", result);
  } catch (err) {
    console.error("[notify] webhook handler error:", err?.message || err);
  }
}
const notifyHandler = async (req, res) => {
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return res.status(500).json({ error: "Stripe not configured" });
    const stripe = new Stripe(key);
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId required" });
    }
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"]
    });
    const result = await notifyForSession(stripe, session);
    return res.json(result);
  } catch (err) {
    console.error("[notify] handler error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "notify failed" });
  }
};
const SEED_CARS = [
  {
    id: "1",
    name: "Chrysler 200",
    type: "Sedan",
    weekly: 290,
    monthly: 1199,
    seats: 5,
    image: "/cars/chrysler-200.jpg",
    imageCredit: "Photo: Kevauto / Wikimedia Commons / CC BY-SA 4.0",
    description: "Smooth, stylish, and easy on gas. The Chrysler 200 is a comfortable sedan that's perfect for daily driving and weekend trips.",
    features: [
      "Backup Camera",
      "Bluetooth Connectivity",
      "Climate Control",
      "Touchscreen Display",
      "Cruise Control",
      "Power Windows"
    ]
  },
  {
    id: "2",
    name: "Chevy Camaro",
    type: "Coupe",
    weekly: 399,
    monthly: 1349,
    seats: 4,
    image: "/cars/camaro.jpg",
    description: "Iconic American muscle. The Chevy Camaro delivers serious performance and head-turning style on every drive.",
    features: [
      "Sport Mode",
      "Backup Camera",
      "Bluetooth Connectivity",
      "Premium Sound",
      "Leather Seats",
      "Apple CarPlay/Android Auto"
    ]
  },
  {
    id: "3",
    name: "Chevy Tahoe",
    type: "SUV",
    weekly: 479,
    monthly: 1599,
    seats: 8,
    image: "/cars/tahoe.jpg",
    description: "A spacious and comfortable SUV perfect for families and group trips. The Chevy Tahoe offers excellent performance and luxury amenities.",
    features: [
      "All-Wheel Drive",
      "Cruise Control",
      "Backup Camera",
      "Bluetooth Connectivity",
      "Climate Control",
      "Leather Seats"
    ]
  }
];
function cloneSeed() {
  return SEED_CARS.map((c) => ({ ...c, features: [...c.features] }));
}
const CONNECTION_STRING = process.env.NETLIFY_DB_URL || process.env.NETLIFY_DATABASE_URL || process.env.NETLIFY_DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";
const DATA_DIR = process.env.LAMBDA_TASK_ROOT ? "/tmp/carnextdrive-data" : path.join(process.cwd(), ".data");
const FILE_PATH = path.join(DATA_DIR, "catalog.json");
let cache = null;
const CACHE_TTL_MS = 3e4;
let pool = null;
let tableReady = null;
function sslConfig(cs) {
  if (/sslmode=disable/.test(cs)) return false;
  if (/sslmode=require|neon\.tech|netlify|\.aws\.|amazonaws/.test(cs)) {
    return { rejectUnauthorized: false };
  }
  return false;
}
function getPool() {
  if (!CONNECTION_STRING) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: CONNECTION_STRING,
      max: 1,
      ssl: sslConfig(CONNECTION_STRING)
    });
  }
  return pool;
}
function ensureTable(p) {
  if (!tableReady) {
    tableReady = p.query(
      `CREATE TABLE IF NOT EXISTS catalog (
           id integer PRIMARY KEY DEFAULT 1,
           cars jsonb NOT NULL,
           updated_at timestamptz NOT NULL DEFAULT now(),
           CONSTRAINT catalog_single_row CHECK (id = 1)
         )`
    ).then(() => void 0).catch((err) => {
      tableReady = null;
      throw err;
    });
  }
  return tableReady;
}
function isValidCatalog(value) {
  return Array.isArray(value) && value.every(
    (c) => c && typeof c === "object" && typeof c.id === "string" && typeof c.name === "string" && typeof c.weekly === "number" && typeof c.monthly === "number"
  );
}
async function readFromDb() {
  const p = getPool();
  if (!p) return null;
  try {
    await ensureTable(p);
    const { rows } = await p.query("SELECT cars FROM catalog WHERE id = 1");
    if (rows.length === 0) return null;
    const cars = rows[0].cars;
    return isValidCatalog(cars) ? cars : null;
  } catch (err) {
    console.warn(
      "[catalog] Postgres read failed:",
      err?.message || err
    );
    return null;
  }
}
async function writeToDb(cars) {
  const p = getPool();
  if (!p) return false;
  try {
    await ensureTable(p);
    await p.query(
      `INSERT INTO catalog (id, cars, updated_at)
       VALUES (1, $1::jsonb, now())
       ON CONFLICT (id) DO UPDATE SET cars = EXCLUDED.cars, updated_at = now()`,
      [JSON.stringify(cars)]
    );
    return true;
  } catch (err) {
    console.error(
      "[catalog] Postgres write failed:",
      err?.message || err
    );
    return false;
  }
}
async function readFromFile() {
  try {
    const raw = await promises.readFile(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return isValidCatalog(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
async function writeToFile(cars) {
  try {
    await promises.mkdir(DATA_DIR, { recursive: true });
    await promises.writeFile(FILE_PATH, JSON.stringify(cars, null, 2), "utf8");
    return true;
  } catch (err) {
    console.warn("[catalog] file write failed:", err?.message || err);
    return false;
  }
}
async function getStoreHealth() {
  const hasConnectionString = Boolean(CONNECTION_STRING);
  if (hasConnectionString) {
    const p = getPool();
    try {
      await ensureTable(p);
      const { rows } = await p.query("SELECT cars FROM catalog WHERE id = 1");
      const cars = rows.length ? rows[0].cars : null;
      return {
        hasConnectionString,
        dbReadable: true,
        carCount: isValidCatalog(cars) ? cars.length : 0,
        source: "postgres"
      };
    } catch (err) {
      return {
        hasConnectionString,
        dbReadable: false,
        carCount: null,
        source: "postgres",
        error: err?.message || String(err)
      };
    }
  }
  const fileCars = await readFromFile();
  return {
    hasConnectionString,
    dbReadable: false,
    carCount: (fileCars ?? cloneSeed()).length,
    source: fileCars ? "file" : "seed"
  };
}
async function getCatalog() {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.cars;
  }
  const fromDb = await readFromDb();
  const cars = fromDb ?? (CONNECTION_STRING ? null : await readFromFile()) ?? cloneSeed();
  cache = { cars, at: Date.now() };
  return cars;
}
async function getCatalogMap() {
  const cars = await getCatalog();
  return Object.fromEntries(cars.map((c) => [c.id, c]));
}
async function saveCatalog(cars) {
  const hasDb = Boolean(CONNECTION_STRING);
  const dbOk = await writeToDb(cars);
  const fileOk = hasDb ? false : await writeToFile(cars);
  cache = { cars, at: Date.now() };
  const durable = hasDb ? dbOk : fileOk;
  if (!durable) {
    console.error(
      `[catalog] catalogue NOT durably persisted (hasDb=${hasDb}, dbOk=${dbOk}, fileOk=${fileOk})`
    );
  }
  return durable;
}
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}
const createCheckoutSession = async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(500).json({
        error: "Stripe is not configured. Set STRIPE_SECRET_KEY in your server environment."
      });
    }
    const {
      carId,
      plan,
      customerEmail,
      customerName,
      phone,
      licenseUrl,
      idUrl,
      originUrl
    } = req.body;
    const catalog = await getCatalogMap();
    if (!carId || !catalog[carId]) {
      return res.status(400).json({ error: "Invalid carId" });
    }
    if (plan !== "weekly" && plan !== "monthly") {
      return res.status(400).json({ error: "Invalid plan" });
    }
    if (!customerEmail) {
      return res.status(400).json({ error: "customerEmail is required" });
    }
    const car = catalog[carId];
    const amountDollars = plan === "weekly" ? car.weekly : car.monthly;
    const interval = plan === "weekly" ? "week" : "month";
    const origin = originUrl || req.headers.origin || `${req.protocol}://${req.get("host")}`;
    const success_url = `${origin}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url = `${origin}/vehicle/${carId}`;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${car.name} — ${plan === "weekly" ? "Weekly" : "Monthly"} Rental`,
              description: plan === "weekly" ? `Charged $${car.weekly}/week until canceled` : `Charged $${car.monthly}/month until canceled`
            },
            unit_amount: Math.round(amountDollars * 100),
            // cents
            recurring: { interval }
          },
          quantity: 1
        }
      ],
      metadata: {
        carId,
        carName: car.name,
        plan,
        customerName: customerName || "",
        phone: phone || "",
        licenseUrl: licenseUrl || "",
        idUrl: idUrl || ""
      },
      subscription_data: {
        metadata: {
          carId,
          carName: car.name,
          plan,
          customerName: customerName || "",
          phone: phone || ""
        }
      },
      success_url,
      cancel_url
    });
    return res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("[stripe] create-checkout-session error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Failed to create checkout session" });
  }
};
const getCheckoutStatus = async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }
    const { sessionId } = req.params;
    if (!sessionId) return res.status(400).json({ error: "sessionId required" });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return res.json({
      status: session.status,
      // open | complete | expired
      payment_status: session.payment_status,
      // paid | unpaid | no_payment_required
      customer_email: session.customer_details?.email || null,
      amount_total: session.amount_total,
      currency: session.currency,
      metadata: session.metadata
    });
  } catch (err) {
    console.error("[stripe] get-checkout-status error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Failed to fetch session" });
  }
};
const stripeWebhook = async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(500).send("Stripe not configured");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        webhookSecret
      );
    } else {
      event = JSON.parse(req.body.toString("utf8"));
      console.warn(
        "[stripe webhook] STRIPE_WEBHOOK_SECRET not set — signature NOT verified"
      );
    }
  } catch (err) {
    console.error("[stripe webhook] signature verification failed:", err?.message);
    return res.status(400).send(`Webhook Error: ${err?.message}`);
  }
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      console.log(
        "[stripe webhook] checkout.session.completed",
        session.id,
        session.customer_email,
        session.metadata
      );
      void notifyFromWebhook(session);
      break;
    }
    case "invoice.payment_succeeded":
    case "invoice.payment_failed":
    case "customer.subscription.deleted":
      console.log(`[stripe webhook] ${event.type}`, event.data.object?.id);
      break;
  }
  return res.json({ received: true });
};
const getCarPricing = async (_req, res) => {
  res.json(await getCatalog());
};
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || process.env.STRIPE_SECRET_KEY || // reuse an existing high-entropy secret if present
"carnextdrive-admin-secret-change-me";
const TOKEN_TTL_MS = 1e3 * 60 * 60 * 8;
function sign(payload) {
  return crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("hex");
}
function issueToken() {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = String(exp);
  const token = `${payload}.${sign(payload)}`;
  return Buffer.from(token, "utf8").toString("base64url");
}
function verifyToken(token) {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const dot = decoded.lastIndexOf(".");
    if (dot < 0) return false;
    const payload = decoded.slice(0, dot);
    const sig = decoded.slice(dot + 1);
    const expected = sign(payload);
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return false;
    }
    const exp = Number(payload);
    return Number.isFinite(exp) && Date.now() < exp;
  } catch {
    return false;
  }
}
function timingSafeStringEqual(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
const requireAdmin = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || !verifyToken(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};
const adminLogin = (req, res) => {
  const password = req.body?.password ?? "";
  if (typeof password !== "string" || !timingSafeStringEqual(password, ADMIN_PASSWORD)) {
    return res.status(401).json({ error: "Incorrect password" });
  }
  return res.json({ token: issueToken(), expiresInMs: TOKEN_TTL_MS });
};
const carInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  type: z.string().trim().max(60).default(""),
  weekly: z.coerce.number().nonnegative("Weekly price must be ≥ 0").max(1e6),
  monthly: z.coerce.number().nonnegative("Monthly price must be ≥ 0").max(1e6),
  seats: z.coerce.number().int().min(1).max(15).default(5),
  image: z.string().trim().max(2e3).default(""),
  imageCredit: z.string().trim().max(300).optional(),
  description: z.string().trim().max(4e3).default(""),
  features: z.array(z.string().trim().min(1).max(120)).max(40).default([])
});
function nextId(cars) {
  const max = cars.reduce((m, c) => {
    const n = parseInt(c.id, 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return String(max + 1);
}
const listCars = async (_req, res) => {
  res.json(await getCatalog());
};
const createCar = async (req, res) => {
  const parsed = carInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid car data" });
  }
  const cars = await getCatalog();
  const car = { id: nextId(cars), ...parsed.data };
  const updated = [...cars, car];
  if (!await saveCatalog(updated)) {
    return res.status(500).json({ error: "Failed to persist catalogue" });
  }
  return res.status(201).json(car);
};
const updateCar = async (req, res) => {
  const { id } = req.params;
  const parsed = carInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid car data" });
  }
  const cars = await getCatalog();
  const idx = cars.findIndex((c) => c.id === id);
  if (idx < 0) return res.status(404).json({ error: "Car not found" });
  const car = { ...cars[idx], ...parsed.data, id };
  const updated = cars.map((c, i) => i === idx ? car : c);
  if (!await saveCatalog(updated)) {
    return res.status(500).json({ error: "Failed to persist catalogue" });
  }
  return res.json(car);
};
const deleteCar = async (req, res) => {
  const { id } = req.params;
  const cars = await getCatalog();
  if (!cars.some((c) => c.id === id)) {
    return res.status(404).json({ error: "Car not found" });
  }
  const updated = cars.filter((c) => c.id !== id);
  if (!await saveCatalog(updated)) {
    return res.status(500).json({ error: "Failed to persist catalogue" });
  }
  return res.json({ ok: true });
};
function createServer() {
  const app2 = express__default();
  app2.use(cors());
  app2.post(
    "/api/stripe-webhook",
    express__default.raw({ type: "application/json" }),
    stripeWebhook
  );
  app2.use(express__default.json({ limit: "20mb" }));
  app2.use(express__default.urlencoded({ extended: true, limit: "20mb" }));
  app2.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });
  app2.get("/api/demo", handleDemo);
  app2.get("/api/health", async (_req, res) => {
    try {
      res.json(await getStoreHealth());
    } catch (err) {
      res.status(500).json({ error: err?.message || "health check failed" });
    }
  });
  app2.post("/api/create-checkout-session", createCheckoutSession);
  app2.get("/api/checkout-status/:sessionId", getCheckoutStatus);
  app2.get("/api/cars", getCarPricing);
  app2.post("/api/upload", uploadMiddleware, uploadHandler);
  app2.post("/api/notify/:sessionId", notifyHandler);
  app2.post("/api/admin/login", adminLogin);
  app2.get("/api/admin/cars", requireAdmin, listCars);
  app2.post("/api/admin/cars", requireAdmin, createCar);
  app2.put("/api/admin/cars/:id", requireAdmin, updateCar);
  app2.delete("/api/admin/cars/:id", requireAdmin, deleteCar);
  return app2;
}
const app = createServer();
const port = process.env.PORT || 3e3;
const __dirname = import.meta.dirname;
const distPath = path.join(__dirname, "../spa");
app.use(express.static(distPath));
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/health")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  res.sendFile(path.join(distPath, "index.html"));
});
app.listen(port, () => {
  console.log(`🚀 Fusion Starter server running on port ${port}`);
  console.log(`📱 Frontend: http://localhost:${port}`);
  console.log(`🔧 API: http://localhost:${port}/api`);
});
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  process.exit(0);
});
process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  process.exit(0);
});
//# sourceMappingURL=node-build.mjs.map
