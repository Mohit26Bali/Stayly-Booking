import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyEmailToken } from "@/server/auth/service";
import { errorResponse } from "@/lib/api-response";

const bodySchema = z.object({ token: z.string().min(1) });

export async function POST(request: NextRequest) {
  try {
    const { token } = bodySchema.parse(await request.json());
    await verifyEmailToken(token);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
