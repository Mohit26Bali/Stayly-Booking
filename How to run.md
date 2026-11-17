# How to run Stayly (Booking)

Verified on Windows 11 with Node 22 and local PostgreSQL. Everything below was exercised: 39 automated tests, a
live run against the production build (47 checks), and the migrations checked against `schema.prisma`.

## 1. Prerequisites
- Node.js 20+ (22 tested) and npm
- PostgreSQL (local or hosted). The role needs to create tables; for the tests it also needs to create a *schema*.
- Redis is **optional**: without it the rate limiter falls back to in-memory (fine for one instance).

## 2. Install
```
npm install --legacy-peer-deps
```
`--legacy-peer-deps` is required: plain `npm install` crashes in npm's resolver (`edgesOut` error) with this
dependency tree. `postinstall` runs `prisma generate` for you (client goes to `src/generated/prisma`, git-ignored).

## 3. Configure `.env`
Copy `.env.example` to `.env` (never commit `.env`).
- **Required:** `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (each 32+ random characters, different
  from each other). `DATABASE_URL` may carry `?schema=...`; the app honours it.
- **Optional:** `RESEND_API_KEY` (no mail is sent without it; it is logged), Razorpay / Stripe keys, Cloudinary,
  Google keys (OAuth and Maps are not wired up yet).
- **Payments:** with a Razorpay (preferred) or Stripe key set, real checkout is used. With **no** provider key:
  - development (`NODE_ENV=development`): bookings are auto-confirmed (demo mode);
  - **production: bookings are refused (503)** unless `ALLOW_DEMO_PAYMENTS=true` is set on purpose.
- **Production settings you should set:** `TRUSTED_PROXY_HOPS` (number of reverse proxies in front of the app),
  `RAZORPAY_WEBHOOK_SECRET` (+ the webhook in the Razorpay dashboard, see below), `CRON_SECRET`.

## 4. Database
```
npx prisma migrate deploy
npm run seed:demo        # 15 hotels, 36 users, 150 bookings ... (see README "Seeding")
```
Other tiers: `npm run seed:minimal`, `npm run seed:production` (admin + amenities only).
Demo logins are in the README ("Demo tier logins"); they are public - never seed a real public site with them.

**Migration `20261117100000_protect_booking_records`** changes the foreign keys so a hotel or room with bookings
cannot be deleted. The application already refuses such deletions in code, so the app runs without it, but
`migrate deploy` adds the database-level safeguard. Apply it to every real database.

## 5. Run
- Development: `npm run dev` -> http://localhost:3000
- Production: `npm run build` then `npm start`

## 6. Webhooks and cron (production, real payments)
- **Razorpay:** dashboard > Settings > Webhooks > URL `https://YOUR-SITE/api/webhooks/razorpay`, events
  `payment.captured` and `order.paid`, secret = `RAZORPAY_WEBHOOK_SECRET`. Without it a guest who pays and
  then closes the browser stays "pending" until the hold expires and the payment is auto-refunded.
- **Stripe:** webhook `https://YOUR-SITE/api/webhooks/stripe`, event `checkout.session.completed`
  (and `checkout.session.async_payment_succeeded`), secret = `STRIPE_WEBHOOK_SECRET`.
- **Cron:** every ~5 minutes call `POST https://YOUR-SITE/api/cron/expire-bookings` with the header
  `Authorization: Bearer <CRON_SECRET>` (Vercel Cron uses GET, which is also accepted). Rooms are never blocked by
  expired holds even if this never runs; it only keeps booking statuses tidy.

## 7. Verify
```
npx tsc --noEmit
npx eslint src
npx vitest run
```
The tests create a throwaway schema `booking_test_*` in the database from `.env`, run the migrations there, and drop
it afterwards; real tables are never touched. Payment providers, Redis and e-mail are faked, so nothing leaves your
machine. If PostgreSQL is unreachable the integration tests are skipped (with a warning).

## Troubleshooting
- `npm install` crash `Cannot read properties of null (reading 'edgesOut')` -> use `--legacy-peer-deps`.
- Vitest fails with `Cannot read properties of undefined (reading 'config')` -> keep `pool: "vmThreads"` in
  `vitest.config.mts` and do not add `setupFiles` (see the comment in that file).
- Checkout answers 503 in production -> no payment keys are configured (by design, see section 3).
- A booking stays "pending" after paying -> the Razorpay/Stripe webhook is not configured (section 6).
- Next build warning about `jose`/Edge runtime is benign.
