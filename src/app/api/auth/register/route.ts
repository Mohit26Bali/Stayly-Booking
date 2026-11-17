import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/features/auth/schemas/auth.schema";
import { registerUser, issueAuthTokens } from "@/server/auth/service";
import { setAuthCookies } from "@/server/auth/cookies";
import { rateLimitByIp } from "@/server/auth/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { errorResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const { allowed } = await rateLimitByIp(getClientIp(request), "register", 5, 60 * 15);
    if (!allowed) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }

    const body = registerSchema.parse(await request.json());
    const user = await registerUser(body);
    const tokens = await issueAuthTokens(user);

    const response = NextResponse.json({ user }, { status: 201 });
    setAuthCookies(response, tokens);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
