# Stayly — Hotel Booking Platform

A full hotel booking platform (Booking.com / Airbnb-style) built with Next.js 15, Prisma, and
PostgreSQL — India-focused, with pricing in ₹ (INR) and demo content centered on Indian cities.

## Tech stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui (Base UI),
  Framer Motion, React Hook Form, Zod, TanStack Query, Zustand, Axios
- **Backend:** Next.js API routes, Prisma ORM 7 (driver adapters), PostgreSQL, Redis (rate limiting,
  typing indicators — falls back to in-memory when unavailable)
- **Auth:** JWT access + refresh tokens (httpOnly cookies), bcrypt password hashing, email
  verification, password reset, role-based route protection (customer / hotel owner / admin) —
  Google OAuth wiring pending real credentials
- **Payments:** Razorpay (Checkout.js + order creation + HMAC signature verification) as the
  primary provider; Stripe Checkout kept as a secondary/fallback provider. Booking auto-confirms
  in "demo mode" when neither is configured.
- **Email:** Resend (logs to console instead of sending when unconfigured)
- **Images:** Local seeded photo pools (real Pexels photography for hotels, rooms, avatars, and the
  homepage hero) wired into the seed script; Cloudinary is configured for real owner-uploaded photos
  but not yet wired into the create-hotel/create-room UI
- **Maps:** Google Maps — scaffolded in `.env.example`, not yet wired into the search map view

## Getting started (local dev)

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Fill in `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` with long random strings, and point
   `DATABASE_URL` at your local Postgres instance (defaults assume a local server with
   database `booking_platform`).

3. **Create the database** (if it doesn't exist)

   ```sql
   CREATE DATABASE booking_platform;
   ```

4. **Run migrations + generate the Prisma client**

   ```bash
   npx prisma migrate dev
   ```

5. **Seed the database** — see "Seeding" below for which tier to use.

   ```bash
   npm run seed:demo
   ```

6. **Start the dev server**

   ```bash
   npm run dev
   ```

   App runs at <http://localhost:3000>.

Redis is optional in dev — rate limiting and typing indicators fall back to in-memory when
`REDIS_URL` is unreachable. Email sending is skipped (logged to console) if `RESEND_API_KEY` is
unset. Payments work the same way — booking checkout auto-confirms locally unless a payment
provider key is set.

## Seeding

Three seed tiers live in `prisma/`, sharing reusable seeder functions from `prisma/seed/`:

| Command                    | What it creates                                                                                                      | Use for                                 |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `npm run seed:minimal`     | 3 hotels, ~9 users, ~20 bookings                                                                                       | Fast everyday local dev                  |
| `npm run seed:demo`        | 15 hotels, 36 users, 150 bookings, reviews, wishlists, notifications, chat conversations, coupons — see below          | Portfolio demos, screenshots, QA         |
| `npm run seed:production`  | Admin account + amenity catalog only                                                                                   | Bootstrapping a real production database |

All three are deterministic (`@faker-js/faker` with a fixed seed — re-running produces the same
names/content) and idempotent (each run clears its own previously-seeded users by email domain
before recreating them, so re-seeding never duplicates data). Minimal and demo can coexist in the
same database without colliding.

**Demo tier logins** (password shown is the same for every account of that role):

- Admin: `admin@example.com` / `Admin@123`
- Hotel owners: `owner1@demo.stayly.dev` … `owner5@demo.stayly.dev` / `Owner@123`
- Customers: `customer1@demo.stayly.dev` … `customer30@demo.stayly.dev` / `Customer@123`

Demo data is built with real business rules, not just random rows: bookings never exceed a room's
unit capacity for overlapping dates, reviews only exist for bookings that are actually eligible to
be reviewed (completed, or confirmed with a past checkout — the same rule the app enforces), room
prices are realistic INR nightly rates by property category, and hotel `avgRating`/`reviewCount`
are recomputed from the reviews actually created. Hotel, room, and avatar photos come from a local
pool of real photography (`public/images/`) rather than placeholder URLs — `prisma/seed/localImages.ts`
assigns them deterministically by category/room-type/city so the same seed run always produces the
same pairing.

## Project structure

```text
src/
  app/                 # App Router routes
    (site)/            # Public/marketing pages + role dashboards (navbar + footer)
    (auth)/            # Auth pages (login, register, password reset, etc.)
    api/                # Route handlers
  components/
    ui/                # shadcn/ui primitives
    layout/            # Navbar, Footer, UserMenu
    shared/             # Small reusable components (theme toggle, etc.)
  features/            # Feature-scoped logic (schemas, hooks, components) per domain:
                        # auth, bookings, dashboard, home, hotels, messages, notifications,
                        # reviews, support
  server/              # Server-only code
    auth/              # JWT, password hashing, tokens, cookies, rate limiting
    bookings/          # Booking creation, availability, cancellation, payment verification
    hotels/            # Hotel/room CRUD + search
    payments/          # Razorpay / Stripe
    reviews/           # Review creation, replies, helpful votes
    coupons/           # Coupon validation
    messages/          # Conversations, typing indicators
    notifications/     # Notification creation/read state
    dashboard/         # Owner/admin dashboard aggregation + chart queries
    db/                # Prisma + Redis clients, shared safe-select fragments
  middleware/          # Edge-safe helpers used by src/middleware.ts
  lib/                 # Shared utilities (env validation, currency formatting, API response helpers)
  services/            # Client-side API layer (axios instance)
  types/               # Shared TypeScript types
prisma/
  schema.prisma        # Full data model
  seed/                # Reusable seeder functions (seedUsers, seedHotels, seedBookings, localImages, ...)
  minimal.seed.ts       # Small dataset entrypoint
  demo.seed.ts          # Full demo dataset entrypoint
  production.seed.ts    # Production bootstrap entrypoint
public/
  images/              # Local seed photo pools (hotel_images/, avatars/, hero/)
```

## Build status

**Done:**

- Auth (register/login/logout, email verification, password reset, refresh-token rotation,
  role-based route protection), real avatar photos wired end-to-end (navbar, reviews, messages)
- Design system: Tailwind theme, dark mode, base layout, validated chart color palette
- Hotel/room CRUD + search (filters, sort, pagination), hotel details page with photo gallery
- Owner room management UI — add/edit/delete rooms with pricing, capacity, and unit counts
  (a hotel isn't bookable, and won't appear in search, until it has at least one priced room)
- Booking engine: transaction-safe double-booking prevention, cancellation, coupon discounts
- Payments: Razorpay (Checkout.js modal, order creation, signature verification), Stripe fallback,
  demo-mode auto-confirm
- Reviews: creation (eligibility-gated), owner replies, helpful votes, rating recomputation
- Messaging (conversations + typing indicators), notifications, support tickets
- Wishlist, customer/owner/admin dashboards with revenue/booking/occupancy charts
- Three-tier seed system with real local photography (this section)
- Pricing and formatting in ₹ (INR) throughout

**Not yet built:** Cloudinary-backed image upload UI (keys are configured, not wired into forms),
Google Maps embed for the search map view, Google OAuth, audit logging, automated tests,
CI/deployment config.

## Environment variables

See `.env.example` for the full list. Required to run locally: `DATABASE_URL`,
`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`. Everything else (Razorpay, Stripe, Cloudinary, Google
Maps, Google OAuth, Resend) is optional in dev — features degrade gracefully or log instead of
sending/calling out. To test real payments, set `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` /
`NEXT_PUBLIC_RAZORPAY_KEY_ID` to test-mode keys from your Razorpay dashboard, then use Razorpay's
test card (`4111 1111 1111 1111`, any future expiry/CVV) or UPI simulator at checkout.

## Setup notes

- Install with `npm install --legacy-peer-deps`, then `npx prisma migrate deploy` and one of the seed tiers described above.
- Payments: with no Razorpay or Stripe key, bookings are confirmed automatically in development only; in production the app refuses to take bookings unless a provider is configured (or `ALLOW_DEMO_PAYMENTS=true` is set on purpose).
- Production settings (webhooks, cron secret, number of proxies) are documented in `.env.example`.
