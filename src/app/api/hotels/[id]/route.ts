import { NextRequest, NextResponse } from "next/server";
import { updateHotelSchema } from "@/features/hotels/schemas/hotel.schema";
import { updateHotel, deleteHotel } from "@/server/hotels/service";
import { requireUser } from "@/server/auth/require-user";
import { prisma } from "@/server/db/client";
import { errorResponse } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = requireUser(request, ["HOTEL_OWNER", "ADMIN"]);
    const { id } = await params;
    const hotel = await prisma.hotel.findUnique({
      where: { id },
      include: { images: true, rooms: { include: { images: true } }, amenities: { include: { amenity: true } } },
    });
    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }
    if (hotel.ownerId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "You don't own this hotel" }, { status: 403 });
    }
    return NextResponse.json({ hotel });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = requireUser(request, ["HOTEL_OWNER", "ADMIN"]);
    const { id } = await params;
    const body = updateHotelSchema.parse(await request.json());
    const hotel = await updateHotel(id, user, body);
    return NextResponse.json({ hotel });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = requireUser(request, ["HOTEL_OWNER", "ADMIN"]);
    const { id } = await params;
    await deleteHotel(id, user);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
