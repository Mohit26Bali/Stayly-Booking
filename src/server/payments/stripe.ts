import Stripe from "stripe";
import { env } from "@/lib/env";

export const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY)
  : null;

export const isStripeConfigured = !!stripe;

export async function createStripeCheckoutSession(params: {
  bookingId: string;
  bookingRef: string;
  hotelName: string;
  roomName: string;
  amount: number;
  currency: string;
}) {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: params.currency.toLowerCase(),
          unit_amount: Math.round(params.amount * 100),
          product_data: {
            name: `${params.hotelName} — ${params.roomName}`,
            description: `Booking ${params.bookingRef}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: { bookingId: params.bookingId, bookingRef: params.bookingRef },
    success_url: `${env.NEXT_PUBLIC_APP_URL}/booking/confirmation/${params.bookingRef}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/booking/checkout/cancelled?bookingRef=${params.bookingRef}`,
  });

  return session;
}

export function constructStripeWebhookEvent(payload: string | Buffer, signature: string) {
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("Stripe webhooks are not configured");
  }
  return stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
}

/** Refunds the card payment behind a Checkout session, in full. */
export async function refundStripeCheckoutSession(sessionId: string, amount: number) {
  if (!stripe) throw new Error("Stripe is not configured");
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (!paymentIntent) throw new Error("This Checkout session has no completed payment to refund");
  return stripe.refunds.create({ payment_intent: paymentIntent, amount: Math.round(amount * 100) });
}
