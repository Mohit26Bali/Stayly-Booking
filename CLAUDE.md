# Stayly (Booking)

Read `PROJECT_CONTEXT.md` first (architecture, booking/payment rules, audit status, known remaining items), then
`README.md` and `How to run.md`.

Rules for changes:
- Business rules live in `src/server/*/service.ts`; route handlers stay thin.
- A booking becomes paid only through `confirmBookingPayment()`; refunds only through `refundPayment()`.
- Install with `npm install --legacy-peer-deps`. Verify with `npx tsc --noEmit`, `npx eslint src`, `npx vitest run`.
