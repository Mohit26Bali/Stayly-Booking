import { NextRequest, NextResponse } from "next/server";
import { unreadNotificationCount } from "@/server/notifications/service";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);
    const count = await unreadNotificationCount(user.id);
    return NextResponse.json({ count });
  } catch (error) {
    return errorResponse(error);
  }
}
