import { NextRequest, NextResponse } from "next/server";
import { createTicketSchema } from "@/features/support/schemas/ticket.schema";
import { createTicket, listMyTickets, listAllTickets } from "@/server/support/service";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);

    if (user.role === "ADMIN") {
      const status = request.nextUrl.searchParams.get("status") ?? undefined;
      const tickets = await listAllTickets(status);
      return NextResponse.json({ tickets });
    }

    const tickets = await listMyTickets(user.id);
    return NextResponse.json({ tickets });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request);
    const body = createTicketSchema.parse(await request.json());
    const ticket = await createTicket(user.id, body);
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
