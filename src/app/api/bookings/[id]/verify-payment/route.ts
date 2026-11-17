import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpayPaymentSchema } from "@/features/bookings/schemas/booking.schema";
import { verifyRazorpayPayment } from "@/server/bookings/service";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = requireUser(request);
    const { id } = await params;
    const body = verifyRazorpayPaymentSchema.parse(await request.json());

    const booking = await verifyRazorpayPayment(id, user.id, {
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
    });

    return NextResponse.json({ booking });
  } catch (error) {
    return errorResponse(error);
  }
}
