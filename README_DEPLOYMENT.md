# Vercel deployment

The deployable application is at the repository root. The files under
`netlify/` remain in place for compatibility with the existing Netlify setup.

## Vercel project settings

Configure the Vercel project with these exact values:

| Setting | Value |
| --- | --- |
| Root Directory | Leave blank (repository root) |
| Framework Preset | `Vite` |
| Install Command | `pnpm install --frozen-lockfile` |
| Build Command | `pnpm run build:client` |
| Output Directory | `dist/spa` |
| Node.js Version | `20.x` |

The build command and output directory are also declared in `vercel.json`.

## Environment variables

Add every variable listed in `.env.example` to the Vercel project for the
Production environment. Use the same values as the working local environment.
In particular:

- `STRIPE_SECRET_KEY` must be available to the server function.
- `ADMIN_PASSWORD` must match the password expected by the working admin portal.
- `ADMIN_TOKEN_SECRET` should be a long random server-side value.
- `DATABASE_URL` is required for durable admin catalogue edits on Vercel.
- `PUBLIC_SITE_URL` should be the final public origin.

Redeploy after adding or changing environment variables. Vercel functions do
not read the local `.env` file from another machine.

Do not prefix server secrets with `VITE_`. They are consumed only by the
Express backend.

## Routing

- Vercel sends `/api/*` requests to `api/index.ts`.
- `api/index.ts` exports the existing Express application from `server/`.
- Existing static files are served from `dist/spa`.
- Other non-file requests fall back to `dist/spa/index.html` for React Router.

No Stripe prices, checkout behavior, booking logic, or frontend routes are
changed by the Vercel adapter.

## Stripe webhook

After the Vercel deployment has been verified, configure the Stripe webhook
endpoint for the Vercel domain:

```text
https://YOUR-VERCEL-DOMAIN/api/stripe-webhook
```

Keep the existing `STRIPE_SECRET_KEY` and use the signing secret associated
with that webhook endpoint as `STRIPE_WEBHOOK_SECRET`.

## Local checks

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm run build
pnpm start
```

The normal production server continues to serve both the frontend and
`/api/*` locally. To test Vercel's routing specifically, use Vercel CLI 47.0.5
or newer:

```bash
vercel dev
```
