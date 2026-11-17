import { NextRequest, NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/features/auth/schemas/auth.schema";
import { requestPasswordReset } from "@/server/auth/service";
import { rateLimitByIp } from "@/server/auth/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { errorResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const { allowed } = await rateLimitByIp(getClientIp(request), "forgot-password", 5, 60 * 15);
    if (!allowed) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }

    const { email } = forgotPasswordSchema.parse(await request.json());
    await requestPasswordReset(email);

    // Always return success to avoid leaking whether an account exists for this email.
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
