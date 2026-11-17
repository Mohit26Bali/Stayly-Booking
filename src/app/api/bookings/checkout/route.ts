import { NextRequest, NextResponse } from "next/server";
import { createBookingSchema } from "@/features/bookings/schemas/booking.schema";
import { createBooking } from "@/server/bookings/service";
import { requireUser } from "@/server/auth/require-user";
import { rateLimit } from "@/server/auth/rate-limit";
import { errorResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request);

    const { allowed } = await rateLimit(`booking:${user.id}`, 10, 60);
    if (!allowed) {
      return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
    }

    const body = createBookingSchema.parse(await request.json());
    const result = await createBooking(user.id, body);

    return NextResponse.json(
      {
        booking: result.booking,
        checkoutUrl: result.checkoutUrl,
        demoMode: result.demoMode,
        razorpay: result.razorpay,
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
