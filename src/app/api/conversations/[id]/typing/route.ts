import { NextRequest, NextResponse } from "next/server";
import { setTyping, getTypingUserId } from "@/server/messages/typing";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = requireUser(request);
    const { id } = await params;
    await setTyping(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = requireUser(request);
    const { id } = await params;
    const typingUserId = await getTypingUserId(id);
    return NextResponse.json({ isOtherTyping: !!typingUserId && typingUserId !== user.id });
  } catch (error) {
    return errorResponse(error);
  }
}
