import { NextRequest, NextResponse } from "next/server";
import { updateRoomSchema } from "@/features/hotels/schemas/hotel.schema";
import { updateRoom, deleteRoom } from "@/server/hotels/service";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string; roomId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = requireUser(request, ["HOTEL_OWNER", "ADMIN"]);
    const { id, roomId } = await params;
    const body = updateRoomSchema.parse(await request.json());
    const room = await updateRoom(id, roomId, user, body);
    return NextResponse.json({ room });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = requireUser(request, ["HOTEL_OWNER", "ADMIN"]);
    const { id, roomId } = await params;
    await deleteRoom(id, roomId, user);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
