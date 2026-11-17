import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setHotelStatus } from "@/server/dashboard/service";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

const bodySchema = z.object({ status: z.enum(["APPROVED", "REJECTED", "SUSPENDED"]) });

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    requireUser(request, ["ADMIN"]);
    const { id } = await params;
    const { status } = bodySchema.parse(await request.json());
    const hotel = await setHotelStatus(id, status);
    return NextResponse.json({ hotel });
  } catch (error) {
    return errorResponse(error);
  }
}
