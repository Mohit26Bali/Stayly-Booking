import { NextRequest, NextResponse } from "next/server";
import { assignTicketSchema } from "@/features/support/schemas/ticket.schema";
import { assignTicket } from "@/server/support/service";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    requireUser(request, ["ADMIN"]);
    const { id } = await params;
    const { assigneeId } = assignTicketSchema.parse(await request.json());
    const ticket = await assignTicket(id, assigneeId);
    return NextResponse.json({ ticket });
  } catch (error) {
    return errorResponse(error);
  }
}
