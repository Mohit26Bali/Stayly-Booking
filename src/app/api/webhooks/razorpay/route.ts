import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpayWebhookSignature } from "@/server/payments/razorpay";
import { confirmBookingPayment } from "@/server/bookings/service";
import { prisma } from "@/server/db/client";

interface RazorpayPaymentEntity {
  id: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
}

/**
 * Razorpay calls this when a payment is captured. This is what saves a paid booking when the guest closes the
 * browser right after paying (the in-page callback never runs then). Configure it in the Razorpay dashboard
 * (Settings > Webhooks) with the events payment.captured and order.paid, and put the secret you choose there
 * into RAZORPAY_WEBHOOK_SECRET.
 */
export async function POST(request: NextRequest) {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Razorpay webhooks are not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!verifyRazorpayWebhookSignature(rawBody, request.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let body: { event?: string; payload?: { payment?: { entity?: RazorpayPaymentEntity } } };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (body.event !== "payment.captured" && body.event !== "order.paid") {
    return NextResponse.json({ received: true });
  }

  const entity = body.payload?.payment?.entity;
  if (!entity?.order_id || !entity.id) return NextResponse.json({ received: true });

  const payment = await prisma.payment.findFirst({
    where: { providerRef: { in: [entity.order_id, entity.id] }, provider: "RAZORPAY" },
  });
  if (!payment || entity.amount !== Math.round(Number(payment.amount) * 100) || entity.status !== "captured") {
    console.error("Razorpay webhook ignored: payment does not match an order", entity.id);
    return NextResponse.json({ received: true });
  }

  try {
    await confirmBookingPayment(payment.bookingId, entity.id);
  } catch (error) {
    console.error("Could not confirm booking from Razorpay webhook", error);
    return NextResponse.json({ error: "Temporary failure" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
