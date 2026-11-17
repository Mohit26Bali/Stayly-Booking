import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { errorResponse } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: "asc" }, take: 1 },
        hotel: { include: { images: { orderBy: { position: "asc" }, take: 1 } } },
      },
    });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    return NextResponse.json({ room });
  } catch (error) {
    return errorResponse(error);
  }
}
