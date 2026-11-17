import { isIP } from "node:net";

/**
 * Extracts the client address from an `X-Forwarded-For` header.
 *
 * The header is forgeable by any client, so it is only meaningful behind a KNOWN number of trusted
 * reverse proxies. Each trusted proxy appends the address it received the connection from, so with N
 * trusted proxies the real client is the Nth entry counted from the RIGHT; anything further left was
 * supplied by the client and is ignored.
 *
 * @param trustedHops number of reverse proxies in front of the app (0 = trust no forwarding headers)
 */
export function clientIpFromForwardedFor(
  header: string | null | undefined,
  trustedHops: number
): string | undefined {
  if (!header || !Number.isInteger(trustedHops) || trustedHops < 1) return undefined;

  const entries = header
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length === 0) return undefined;

  const candidate = entries[entries.length - trustedHops] ?? entries[0];
  return isIP(candidate) ? candidate : undefined;
}

/** Number of trusted reverse proxies, from TRUSTED_PROXY_HOPS (default 0 = none, e.g. local dev). */
export function getTrustedProxyHops() {
  const raw = Number(process.env.TRUSTED_PROXY_HOPS ?? 0);
  return Number.isInteger(raw) && raw > 0 && raw <= 5 ? raw : 0;
}
