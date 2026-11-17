import { NextRequest, NextResponse } from "next/server";
import { getBookingByRef } from "@/server/bookings/service";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ bookingRef: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = requireUser(request);
    const { bookingRef } = await params;
    const booking = await getBookingByRef(bookingRef, user.id);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    return NextResponse.json({ booking });
  } catch (error) {
    return errorResponse(error);
  }
}
