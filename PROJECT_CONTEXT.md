# PROJECT_CONTEXT - Stayly (Booking)

Give this file and README.md to a new AI assistant. Status: audited, hardened, tested and live-verified.
Setup: see `How to run.md`.

## What it is
A hotel booking platform (Booking.com / Airbnb style), India-focused (INR). Next.js 15 App Router (pages + API route
handlers), React 19, Prisma 7 with the `pg` driver adapter, PostgreSQL, Zod 4, TanStack Query, Zustand, Tailwind 4 /
shadcn (Base UI). Auth: JWT access (15 min) + refresh (30 d, rotated, hashed in DB) in httpOnly cookies, roles
CUSTOMER / HOTEL_OWNER / ADMIN, checked by `src/middleware.ts` (pages) and `requireUser()` (APIs). Payments: Razorpay
(preferred) or Stripe. Redis optional (rate limit, typing indicators; in-memory fallback). Resend e-mail (logs when no key).

## Layout
- `src/app/(site)` pages, `src/app/(auth)`, `src/app/api/**/route.ts` handlers (thin: validate with Zod, call a service).
- `src/server/<area>/service.ts` - ALL business rules: `auth`, `bookings`, `hotels`, `reviews`, `coupons`, `payments`,
  `messages`, `notifications`, `dashboard`, `support`. `src/server/bookings/policy.ts` holds tunable rules.
- `src/features/*` client hooks/components/schemas. `prisma/` schema, migrations, three seed tiers.
- `src/test/` real-database integration tests (`booking.integration.test.ts`), harness `test-db.ts`.
- `src/generated/prisma` is generated (git-ignored): `npx prisma generate`.

## Booking and payment rules (keep these true)
- Prices are computed on the server from the room price: subtotal = price x nights x units, tax 12%, coupon after
  tax; stored as INR. A stay is 1-30 nights, up to 365 days ahead; guests <= maxGuests x units; owners can't book
  their own property; only APPROVED hotels and rooms with `isAvailable` can be booked.
- Availability counts CONFIRMED bookings plus PENDING ones younger than the hold (`BOOKING_HOLD_MINUTES`, 30).
  Creation runs in a SERIALIZABLE transaction and retries collisions (`serializable()` in `bookings/service.ts`).
- `confirmBookingPayment()` is THE way a booking becomes paid. It is idempotent and called from the Razorpay
  callback, the Razorpay webhook and the Stripe webhook. A payment that arrives for a cancelled booking, or an
  expired one whose room was taken, is refunded automatically instead of confirming (no overbooking, no revival).
- `refundPayment()` calls the provider first and only then marks the payment REFUNDED; if the provider fails the
  payment stays SUCCEEDED (logged) and can be retried. Payments without a `providerRef` are local demo payments.
- Cancellation: PENDING = released (payment FAILED, coupon returned); CONFIRMED = full refund when >= 48 h
  (`FREE_CANCELLATION_HOURS`) before check-in, otherwise cancelled without refund; started stays can't be cancelled
  online. The API returns `refund: {status, amount}`. **The 48 h/full-or-nothing policy is a default chosen during the
  audit, not a documented business decision - change `policy.ts` if the business wants something else.**
- Without a payment provider: development auto-confirms (demo mode); production REFUSES (503) unless
  `ALLOW_DEMO_PAYMENTS=true`.
- Hotels/rooms that have bookings can't be deleted (code check + FK `Restrict` migration); rooms can be switched off
  with `isAvailable: false`; `totalUnits` can't drop below upcoming bookings.
- Roles live in the JWT: a demoted or deactivated user keeps access for up to 15 minutes (refresh is refused at once).

## What was fixed in the audit (each with a regression test that fails against the old code)
Free auto-confirmed bookings in production without keys; hotel/room deletion silently erasing bookings, payments and
reviews (cascade); cancellation that only relabelled the payment as refunded (no money moved); payment confirmation that
could revive cancelled bookings, double-book rooms and ran twice from webhooks (no status guard, Stripe event not checked
for `paid`/amount); paid bookings lost when the browser closed (no Razorpay webhook); unpaid bookings holding rooms
forever; bookable unapproved/unavailable rooms; no guest-capacity check; serialization failures surfacing as 500; coupon
issues (`$` message, `maxDiscountAmount` ignored, coupon burned by unpaid bookings); duplicate accounts by e-mail case;
login brute force (IP only, forgeable `X-Forwarded-For`) - now per-account + trusted-proxy IP; non-atomic reset/verify
tokens and refresh rotation; unknown-user timing; review double-submit crash; passwords > 72 chars / common passwords.
Also: security headers, `X-Powered-By` off, `shadcn` moved to devDependencies, npm audit 29 -> 2 production findings.

## Verification
- `tsc` and `eslint` clean. `npx vitest run`: 39 tests (33 integration on a throwaway schema, harness, IP helper).
- Mutation-checked: re-introducing three of the old bugs (demo payments in production, no retry, fake refund) makes the
  suite fail.
- Live run against the production build on a throwaway schema: 47/47 checks (see `How to run.md` section 7 for the idea).
- `prisma migrate diff` between the migrations and `schema.prisma`: no difference. Real database untouched by tests.

## Known remaining items (not fixed)
1. **The new migration is not applied to the author's local database** (the app works without it; run
   `npx prisma migrate deploy`).
2. No Content-Security-Policy (needs Razorpay Checkout, Google Maps, Cloudinary allowances and browser testing).
3. Search ignores `checkIn`/`checkOut` (it accepts them but doesn't filter by availability) and doesn't hide
   `isAvailable: false` rooms from price filters. `RoomAvailability` table is unused.
4. Email verification is never enforced; Google OAuth, Cloudinary upload UI and Google Maps are not wired up.
5. In-memory rate limiter is per instance without Redis. Access-token role/active state can lag up to 15 min.
6. Remaining npm audit items come from the `postcss` bundled in Next; the fix is the Next 16 major upgrade.
7. Admin-side audit logging exists as a table (`AuditLog`) but is not written by admin actions (hotel status,
   ticket assignment); no admin UI for it. No automated UI/browser tests (the UI was not exercised in a browser).
8. Real Razorpay/Stripe calls were NOT exercised (providers are faked in tests); do one test-mode payment, a refund
   and a webhook delivery from the Razorpay dashboard before going live.
9. A vitest quirk: default pools fail here, `vmThreads` is pinned (cause not investigated).

## Secrets / operational notes
- `.env` holds real values for Resend, Cloudinary and **Razorpay (test-mode keys)**; values are not recorded here. The
  folder is a git repository with NO commits and a partly staged index; `.gitignore` excludes `.env*` (now except
  `.env.example`), `node_modules`, `.next`, `src/generated/prisma`. Run `git status` and review before the first commit.
- Demo seed accounts (README) have public passwords; `Admin@123` etc. are only for local/demo data.
- `.claude/`, `.agents/`, `.windsurf/`, `skills-lock.json` are AI-tool Prisma skill folders (not application code).
