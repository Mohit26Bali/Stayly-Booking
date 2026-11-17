import { NextRequest, NextResponse } from "next/server";
import { listNotifications } from "@/server/notifications/service";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);
    const notifications = await listNotifications(user.id);
    return NextResponse.json({ notifications });
  } catch (error) {
    return errorResponse(error);
  }
}
