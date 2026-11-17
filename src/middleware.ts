import { NextRequest, NextResponse } from "next/server";
import { verifyAccessTokenEdge } from "@/middleware/auth-edge";
import { ACCESS_TOKEN_COOKIE } from "@/server/auth/cookies";

type Role = "GUEST" | "CUSTOMER" | "HOTEL_OWNER" | "ADMIN";

const ROLE_PROTECTED_PREFIXES: Array<{ prefix: string; roles: Role[] }> = [
  { prefix: "/dashboard/admin", roles: ["ADMIN"] },
  { prefix: "/dashboard/owner", roles: ["HOTEL_OWNER"] },
  { prefix: "/dashboard/customer", roles: ["CUSTOMER", "HOTEL_OWNER", "ADMIN"] },
  { prefix: "/account", roles: ["CUSTOMER", "HOTEL_OWNER", "ADMIN"] },
  { prefix: "/booking/checkout", roles: ["CUSTOMER", "HOTEL_OWNER", "ADMIN"] },
  { prefix: "/messages", roles: ["CUSTOMER", "HOTEL_OWNER", "ADMIN"] },
  { prefix: "/support", roles: ["CUSTOMER", "HOTEL_OWNER", "ADMIN"] },
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const match = ROLE_PROTECTED_PREFIXES.find((entry) => pathname.startsWith(entry.prefix));

  if (!match) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const payload = accessToken ? await verifyAccessTokenEdge(accessToken) : null;

  if (!payload) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (!match.roles.includes(payload.role)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/account/:path*",
    "/booking/checkout/:path*",
    "/messages/:path*",
    "/support/:path*",
  ],
};
