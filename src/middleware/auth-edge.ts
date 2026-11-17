import { jwtVerify } from "jose";

export interface EdgeAccessTokenPayload {
  sub: string;
  email: string;
  role: "GUEST" | "CUSTOMER" | "HOTEL_OWNER" | "ADMIN";
}

export async function verifyAccessTokenEdge(
  token: string,
): Promise<EdgeAccessTokenPayload | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as EdgeAccessTokenPayload;
  } catch {
    return null;
  }
}
