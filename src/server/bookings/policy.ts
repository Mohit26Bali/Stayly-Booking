/**
 * Booking rules that a deployment may tune through environment variables. They are read on every call (not
 * once at import) so tests and operators can change them without a rebuild.
 */

function intFromEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = Number(process.env[name]);
  return Number.isInteger(raw) && raw >= min && raw <= max ? raw : fallback;
}

/** How long an unpaid (PENDING) booking holds its room before it expires. Default 30 minutes. */
export function bookingHoldMinutes(): number {
  return intFromEnv("BOOKING_HOLD_MINUTES", 30, 5, 240);
}

/** Cancelling at least this many hours before check-in refunds in full; later cancellations are not refunded. */
export function freeCancellationHours(): number {
  return intFromEnv("FREE_CANCELLATION_HOURS", 48, 0, 24 * 30);
}

/**
 * Without a payment provider the app can "auto-confirm" bookings so the flow can be demoed locally. That must
 * never happen by accident in production (a missing or mistyped key would hand out free stays), so it is only
 * allowed outside production, or when ALLOW_DEMO_PAYMENTS=true is set on purpose.
 */
export function demoPaymentsAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_PAYMENTS === "true";
}

export const MAX_STAY_NIGHTS = 30;
export const MAX_ADVANCE_DAYS = 365;
export const TAX_RATE = 0.12;
