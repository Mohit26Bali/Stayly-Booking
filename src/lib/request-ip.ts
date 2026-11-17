import type { NextRequest } from "next/server";
import { clientIpFromForwardedFor, getTrustedProxyHops } from "@/lib/client-ip";

/**
 * The caller's IP address, or "unknown".
 *
 * `X-Forwarded-For` is only believed behind a known number of reverse proxies (TRUSTED_PROXY_HOPS); the old
 * code trusted its first entry, which any client can forge to dodge rate limits. With TRUSTED_PROXY_HOPS=0
 * (the default, e.g. local development) no forwarding header is trusted and the result is "unknown".
 */
export function getClientIp(request: NextRequest): string {
  return clientIpFromForwardedFor(request.headers.get("x-forwarded-for"), getTrustedProxyHops()) ?? "unknown";
}
