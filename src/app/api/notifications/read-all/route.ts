import { NextRequest, NextResponse } from "next/server";
import { markAllNotificationsRead } from "@/server/notifications/service";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request);
    await markAllNotificationsRead(user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
