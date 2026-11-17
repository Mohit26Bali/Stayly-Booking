import { NextRequest, NextResponse } from "next/server";
import { revokeRefreshToken } from "@/server/auth/service";
import { REFRESH_TOKEN_COOKIE, clearAuthCookies } from "@/server/auth/cookies";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  const response = NextResponse.json({ success: true });
  clearAuthCookies(response);
  return response;
}
