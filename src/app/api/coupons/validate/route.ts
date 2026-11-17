import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateCoupon } from "@/server/coupons/service";
import { requireUser } from "@/server/auth/require-user";
import { errorResponse } from "@/lib/api-response";

const bodySchema = z.object({
  code: z.string().min(1),
  amount: z.number().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const user = requireUser(request);
    const { code, amount } = bodySchema.parse(await request.json());
    const preview = await validateCoupon(code, user.id, amount);
    return NextResponse.json(preview);
  } catch (error) {
    return errorResponse(error);
  }
}
