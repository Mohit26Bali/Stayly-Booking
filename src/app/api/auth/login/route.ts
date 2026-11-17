import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/features/auth/schemas/auth.schema";
import { authenticateUser, issueAuthTokens } from "@/server/auth/service";
import { setAuthCookies } from "@/server/auth/cookies";
import { rateLimit, rateLimitByIp, isRateLimited } from "@/server/auth/rate-limit";
import { AuthError } from "@/server/auth/service";
import { getClientIp } from "@/lib/request-ip";
import { errorResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const { allowed } = await rateLimitByIp(getClientIp(request), "login", 20, 60 * 15);
    if (!allowed) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }

    const body = loginSchema.parse(await request.json());

    // Per-ACCOUNT brute-force protection, independent of the (shareable, spoofable) IP address: after 8 wrong
    // passwords for one e-mail the account refuses logins for the rest of the window.
    const accountKey = `login-fail:${body.email}`;
    if (await isRateLimited(accountKey, 8)) {
      return NextResponse.json(
        { error: "Too many failed attempts for this account. Try again in 15 minutes." },
        { status: 429 },
      );
    }

    let user;
    try {
      user = await authenticateUser(body);
    } catch (error) {
      if (error instanceof AuthError && error.status === 401) await rateLimit(accountKey, 8, 60 * 15);
      throw error;
    }
    const tokens = await issueAuthTokens(user);

    const response = NextResponse.json({ user });
    setAuthCookies(response, tokens);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
