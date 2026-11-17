import { NextRequest, NextResponse } from "next/server";
import { constructStripeWebhookEvent } from "@/server/payments/stripe";
import { confirmBookingPayment } from "@/server/bookings/service";
import { prisma } from "@/server/db/client";

/**
 * Stripe calls this when a Checkout session is paid. It may call it more than once for the same payment
 * (retries) - confirmBookingPayment is idempotent, so that is harmless. A genuine failure on our side returns
 * a 5xx so Stripe retries later; a payment that does not add up is acknowledged and ignored (retrying won't fix it).
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const payload = await request.text();

  let event;
  try {
    event = constructStripeWebhookEvent(payload, signature);
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    const bookingId = session.metadata?.bookingId;

    // "completed" also fires for delayed payment methods that have not been paid yet.
    if (session.payment_status !== "paid" || !bookingId) {
      return NextResponse.json({ received: true });
    }

    const payment = await prisma.payment.findFirst({ where: { bookingId, providerRef: session.id } });
    const expectedAmount = payment ? Math.round(Number(payment.amount) * 100) : null;
    if (!payment || session.amount_total !== expectedAmount || session.currency?.toUpperCase() !== payment.currency) {
      console.error("Stripe webhook ignored: session does not match a pending payment", session.id);
      return NextResponse.json({ received: true });
    }

    try {
      await confirmBookingPayment(bookingId, session.id);
    } catch (error) {
      console.error("Could not confirm booking from Stripe webhook", error);
      return NextResponse.json({ error: "Temporary failure" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
