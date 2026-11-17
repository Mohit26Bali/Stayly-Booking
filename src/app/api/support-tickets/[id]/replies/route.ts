import { NextRequest, NextResponse } from "next/server";
import { addReplySchema } from "@/features/support/schemas/ticket.schema";
import { addTicketReply } from "@/server/support/service";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = requireUser(request);
    const { id } = await params;
    const { content } = addReplySchema.parse(await request.json());
    const reply = await addTicketReply(id, user.id, content, user.role === "ADMIN");
    return NextResponse.json({ reply }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
