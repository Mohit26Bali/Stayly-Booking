import { NextRequest, NextResponse } from "next/server";
import { markNotificationRead } from "@/server/notifications/service";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = requireUser(request);
    const { id } = await params;
    const notification = await markNotificationRead(id, user.id);
    return NextResponse.json({ notification });
  } catch (error) {
    return errorResponse(error);
  }
}
