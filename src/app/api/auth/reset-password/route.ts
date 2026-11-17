import { NextRequest, NextResponse } from "next/server";
import { resetPasswordSchema } from "@/features/auth/schemas/auth.schema";
import { resetPassword } from "@/server/auth/service";
import { errorResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = resetPasswordSchema.parse(await request.json());
    await resetPassword(token, password);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
