import { NextRequest, NextResponse } from "next/server";
import { startConversationSchema } from "@/features/messages/schemas/message.schema";
import { listConversationsForUser, startConversation } from "@/server/messages/service";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);
    const conversations = await listConversationsForUser(user.id, user.role);
    return NextResponse.json({ conversations });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request, ["CUSTOMER", "HOTEL_OWNER", "ADMIN"]);
    const body = startConversationSchema.parse(await request.json());
    const result = await startConversation(user.id, body.hotelId, body.subject, body.message);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
