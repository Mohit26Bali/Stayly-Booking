import { NextRequest, NextResponse } from "next/server";
import { unreadMessageCount } from "@/server/messages/service";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);
    const count = await unreadMessageCount(user.id, user.role);
    return NextResponse.json({ count });
  } catch (error) {
    return errorResponse(error);
  }
}
