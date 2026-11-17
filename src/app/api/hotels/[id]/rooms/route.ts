import { NextRequest, NextResponse } from "next/server";
import { createRoomSchema } from "@/features/hotels/schemas/hotel.schema";
import { createRoom } from "@/server/hotels/service";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = requireUser(request, ["HOTEL_OWNER", "ADMIN"]);
    const { id } = await params;
    const body = createRoomSchema.parse(await request.json());
    const room = await createRoom(id, user, body);
    return NextResponse.json({ room }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
