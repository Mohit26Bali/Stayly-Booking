import { NextRequest, NextResponse } from "next/server";
import { getTicketDetail } from "@/server/support/service";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = requireUser(request);
    const { id } = await params;
    const ticket = await getTicketDetail(id, user.id, user.role === "ADMIN");
    return NextResponse.json({ ticket });
  } catch (error) {
    return errorResponse(error);
  }
}
