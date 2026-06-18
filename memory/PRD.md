# CarNextDrive — PRD

## Original problem statement
Modify the existing CarNextDrive site to add Weekly and Monthly recurring
Stripe subscriptions to the booking flow. Customers choose a plan on the
vehicle page, fill the existing application form, then are redirected to
real Stripe Checkout for a recurring subscription (`week` or `month`
interval) using the existing keys (test mode). After payment, show a
confirmation page. Do not redesign the UI. Owner reviews applications and
cancels subscriptions manually — no admin panel.

## Tech stack (existing)
- Frontend: React 18 + Vite + React Router 6 + TypeScript + Tailwind 3
- Backend: Express (TypeScript), integrated as Vite middleware in dev;
  deployed to Netlify Functions in production
- Payments: **Stripe Checkout subscriptions** (added in this iteration) via
  the official `stripe` npm SDK
- Optional integrations (env-var gated): Formspree (email), Cloudinary
  (license/ID image hosting)

## Source of truth
- Pricing: `server/routes/stripe.ts` → `CAR_CATALOG`
- Frontend display prices: `client/pages/Index.tsx` + `VehicleDetail.tsx`
  (kept in sync manually).

## Final pricing
| Car          | Weekly | Monthly |
| ------------ | -----: | ------: |
| Chrysler 200 |  $349  |  $1,199 |
| Chevy Camaro |  $399  |  $1,349 |
| Chevy Tahoe  |  $479  |  $1,599 |

## What was implemented (2026-01)
- `server/routes/stripe.ts` (NEW) — `POST /api/create-checkout-session`,
  `GET /api/checkout-status/:id`, `GET /api/cars`, `POST /api/stripe-webhook`
  with signature verification when `STRIPE_WEBHOOK_SECRET` is set.
- `server/index.ts` — registered Stripe routes; webhook uses raw body.
- `server/dev-server.ts` (NEW) — standalone Express launcher for local
  testing on a different port than Vite.
- `client/pages/Index.tsx` — replaced car catalog with the 3 new cars;
  cards show both weekly and monthly prices.
- `client/pages/VehicleDetail.tsx` — new car data; added Weekly/Monthly
  plan selector; "Book This Car" navigates to
  `/signup?carId=X&plan=Y&price=Z`.
- `client/pages/Signup.tsx` — reads selection from query string, shows a
  "You're booking" summary, optional Cloudinary uploads + optional
  Formspree submission (both env-var gated), then POSTs to
  `/api/create-checkout-session` and redirects to Stripe Checkout.
- `client/pages/Success.tsx` (NEW) — `/success?session_id=…` page that
  polls the backend to verify the session and shows the required message:
  *"Application and payment submitted. We will review your application
  and email pickup details if approved."*
- `client/App.tsx` — registered `/success` route.
- `.env.example` (NEW) — documents `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, optional `VITE_FORMSPREE_ENDPOINT`,
  `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET`.
- `STRIPE_SETUP.md` (NEW) — step-by-step setup, webhook config, test
  instructions, going-live checklist.
- `package.json` — added `stripe` dep via pnpm.

## Verified
- ✅ `POST /api/create-checkout-session` returns a real
  `https://checkout.stripe.com/c/pay/cs_test_…` URL.
- ✅ Weekly plan creates session with `recurring.interval = week` and
  correct amount.
- ✅ Monthly plan creates session with `recurring.interval = month`.
- ✅ Invalid `carId` / `plan` returns 400.
- ✅ Session metadata contains carId, carName, plan, customerName, phone,
  licenseUrl, idUrl.
- ✅ Frontend e2e: home → vehicle → plan select → signup → form fill →
  submit → real Stripe Checkout page rendered ("Subscribe to Chevy Camaro
  — Weekly Rental, Charged $399/week until canceled, Billed weekly").
- ✅ Email pre-filled in Stripe Checkout from form.
- ✅ Confirmation page polls `GET /api/checkout-status/:id` and shows the
  required confirmation message.

## What was NOT touched (per user requirement)
- Dashboard page, Navigation, global styles, Tailwind config, NotFound.
- The repo did not contain Formspree/Cloudinary/auth code at the latest
  commit. Wiring for both was added but they only activate when their
  respective env vars are set; nothing is broken if they aren't.

## Manual workflow (no admin panel)
- Review apps: Stripe Dashboard → Customers (metadata + Formspree email if
  enabled).
- Email pickup: owner's own inbox.
- End rental: Stripe Dashboard → Customer → Subscriptions → Cancel.

## Backlog / future
- P1: persistent applications log (Mongo/Notion/Airtable) once owner wants
  history beyond Stripe metadata.
- P2: admin panel (list apps, approve/reject, auto-email).
- P2: Stripe customer portal link for self-service cancellation.
- P3: pause/resume subscription, prorated upgrade weekly → monthly.

## Test credentials
- Stripe test card: `4242 4242 4242 4242`, any future exp, any CVC, any
  ZIP.
- Owner Stripe Dashboard: https://dashboard.stripe.com/test/payments
