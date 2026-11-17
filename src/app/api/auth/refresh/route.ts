import { NextRequest, NextResponse } from "next/server";
import { rotateRefreshToken } from "@/server/auth/service";
import { REFRESH_TOKEN_COOKIE, setAuthCookies, clearAuthCookies } from "@/server/auth/cookies";
import { errorResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
    if (!refreshToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const tokens = await rotateRefreshToken(refreshToken);

    const response = NextResponse.json({ success: true });
    setAuthCookies(response, tokens);
    return response;
  } catch (error) {
    const response = errorResponse(error);
    clearAuthCookies(response);
    return response;
  }
}
