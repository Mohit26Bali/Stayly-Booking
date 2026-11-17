import { NextRequest, NextResponse } from "next/server";
import { setTicketStatusSchema } from "@/features/support/schemas/ticket.schema";
import { setTicketStatus } from "@/server/support/service";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    requireUser(request, ["ADMIN"]);
    const { id } = await params;
    const { status } = setTicketStatusSchema.parse(await request.json());
    const ticket = await setTicketStatus(id, status);
    return NextResponse.json({ ticket });
  } catch (error) {
    return errorResponse(error);
  }
}
