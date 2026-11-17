import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

const bodySchema = z.object({ hotelId: z.string().min(1) });

export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);
    const items = await prisma.wishlist.findMany({
      where: { userId: user.id },
      include: {
        hotel: { include: { images: { take: 1, orderBy: { position: "asc" } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ items });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request);
    const { hotelId } = bodySchema.parse(await request.json());

    const existing = await prisma.wishlist.findUnique({
      where: { userId_hotelId: { userId: user.id, hotelId } },
    });

    if (existing) {
      await prisma.wishlist.delete({ where: { id: existing.id } });
      return NextResponse.json({ saved: false });
    }

    await prisma.wishlist.create({ data: { userId: user.id, hotelId } });
    return NextResponse.json({ saved: true });
  } catch (error) {
    return errorResponse(error);
  }
}
