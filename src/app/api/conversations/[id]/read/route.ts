import { NextRequest, NextResponse } from "next/server";
import { markConversationRead } from "@/server/messages/service";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = requireUser(request);
    const { id } = await params;
    await markConversationRead(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
