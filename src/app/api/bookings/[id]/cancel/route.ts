import { NextRequest, NextResponse } from "next/server";
import { cancelBookingSchema } from "@/features/bookings/schemas/booking.schema";
import { cancelBooking } from "@/server/bookings/service";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = requireUser(request);
    const { id } = await params;
    const body = cancelBookingSchema.parse(await request.json().catch(() => ({})));
    const { booking, refund } = await cancelBooking(id, user.id, body.reason);
    return NextResponse.json({ booking, refund });
  } catch (error) {
    return errorResponse(error);
  }
}
