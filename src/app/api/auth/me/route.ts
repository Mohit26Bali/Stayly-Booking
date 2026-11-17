import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/server/auth/jwt";
import { getPublicUserById } from "@/server/auth/service";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/cookies";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const payload = verifyAccessToken(accessToken);
  if (!payload) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await getPublicUserById(payload.sub);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({ user });
}
