import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listUserBookings } from "@/server/bookings/service";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

const querySchema = z.object({
  scope: z.enum(["upcoming", "past", "all"]).default("all"),
});

export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);
    const { scope } = querySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    const bookings = await listUserBookings(user.id, scope);
    return NextResponse.json({ bookings });
  } catch (error) {
    return errorResponse(error);
  }
}
