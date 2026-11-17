import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { expireStaleBookings } from "@/server/bookings/service";

/**
 * Housekeeping endpoint: expires unpaid bookings whose hold has run out. Call it every few minutes from a
 * scheduler (Vercel Cron, a Linux cron job with curl, ...) with `Authorization: Bearer <CRON_SECRET>`.
 * Rooms are never blocked by expired holds even if this is never called - it only keeps statuses tidy.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ expired: await expireStaleBookings() });
}

// Vercel Cron issues GET requests.
export const GET = POST;
