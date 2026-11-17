import type { NextRequest } from "next/server";
import { verifyAccessToken } from "@/server/auth/jwt";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/cookies";
import { AuthError } from "@/server/auth/service";
import type { Role } from "@/generated/prisma/enums";

export interface RequestUser {
  id: string;
  email: string;
  role: Role;
}

export function getRequestUser(request: NextRequest): RequestUser | null {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) return null;

  const payload = verifyAccessToken(accessToken);
  if (!payload) return null;

  return { id: payload.sub, email: payload.email, role: payload.role };
}

export function requireUser(request: NextRequest, roles?: Role[]): RequestUser {
  const user = getRequestUser(request);
  if (!user) {
    throw new AuthError("Not authenticated", 401);
  }
  if (roles && !roles.includes(user.role)) {
    throw new AuthError("You don't have permission to do that", 403);
  }
  return user;
}
