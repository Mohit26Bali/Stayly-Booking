import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import { env } from "@/lib/env";

export const razorpay =
  env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET
    ? new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET })
    : null;

export const isRazorpayConfigured = !!razorpay;

export async function createRazorpayOrder(params: {
  bookingId: string;
  bookingRef: string;
  amount: number;
  currency: string;
}) {
  if (!razorpay) {
    throw new Error("Razorpay is not configured");
  }

  return razorpay.orders.create({
    amount: Math.round(params.amount * 100),
    currency: params.currency,
    receipt: params.bookingRef,
    notes: { bookingId: params.bookingId },
  });
}

/** Verifies the HMAC-SHA256 signature Razorpay's Checkout.js returns after a successful payment. */
export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  if (!env.RAZORPAY_KEY_SECRET) return false;

  const expected = createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(params.signature, "hex");
  if (expectedBuf.length !== actualBuf.length) return false;

  return timingSafeEqual(expectedBuf, actualBuf);
}

/**
 * Verifies the `X-Razorpay-Signature` header of a webhook call: HMAC-SHA256 of the RAW request body with the
 * webhook secret (a different secret from the API key secret, set in the Razorpay dashboard).
 */
export function verifyRazorpayWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

/** Refunds a captured payment (amount in rupees, refunded in full unless a smaller amount is given). */
export async function refundRazorpayPayment(paymentId: string, amount: number, reason: string) {
  if (!razorpay) throw new Error("Razorpay is not configured");
  return razorpay.payments.refund(paymentId, {
    amount: Math.round(amount * 100),
    notes: { reason },
  });
}
