import { NextRequest, NextResponse } from "next/server";
import { getReviewableBookings } from "@/server/reviews/service";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);
    const bookings = await getReviewableBookings(user.id);
    return NextResponse.json({ bookings });
  } catch (error) {
    return errorResponse(error);
  }
}
