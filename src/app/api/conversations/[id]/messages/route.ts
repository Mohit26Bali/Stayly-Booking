import { NextRequest, NextResponse } from "next/server";
import { sendMessageSchema } from "@/features/messages/schemas/message.schema";
import { getConversationMessages, sendMessage } from "@/server/messages/service";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = requireUser(request);
    const { id } = await params;
    const result = await getConversationMessages(id, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = requireUser(request);
    const { id } = await params;
    const { content } = sendMessageSchema.parse(await request.json());
    const message = await sendMessage(id, user.id, content);
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
