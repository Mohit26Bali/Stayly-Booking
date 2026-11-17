import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phone: z.string().max(30).optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);
    const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
    return NextResponse.json({ profile });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = requireUser(request);
    const body = updateProfileSchema.parse(await request.json());

    const profile = await prisma.profile.upsert({
      where: { userId: user.id },
      update: body,
      create: { userId: user.id, ...body },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    return errorResponse(error);
  }
}
