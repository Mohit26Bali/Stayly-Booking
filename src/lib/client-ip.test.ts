import { describe, it, expect } from "vitest";
import { clientIpFromForwardedFor, getTrustedProxyHops } from "@/lib/client-ip";

describe("clientIpFromForwardedFor", () => {
  it("trusts nothing when no proxy is configured (header is forgeable)", () => {
    expect(clientIpFromForwardedFor("1.2.3.4", 0)).toBeUndefined();
  });
  it("takes the entry added by the trusted proxy, not the one the client supplied", () => {
    expect(clientIpFromForwardedFor("6.6.6.6, 203.0.113.9", 1)).toBe("203.0.113.9");
    expect(clientIpFromForwardedFor("6.6.6.6, 203.0.113.9, 10.0.0.2", 2)).toBe("203.0.113.9");
  });
  it("rejects garbage", () => {
    expect(clientIpFromForwardedFor("not-an-ip", 1)).toBeUndefined();
    expect(clientIpFromForwardedFor("", 1)).toBeUndefined();
  });
  it("reads TRUSTED_PROXY_HOPS defensively", () => {
    const old = process.env.TRUSTED_PROXY_HOPS;
    process.env.TRUSTED_PROXY_HOPS = "2";
    expect(getTrustedProxyHops()).toBe(2);
    process.env.TRUSTED_PROXY_HOPS = "999";
    expect(getTrustedProxyHops()).toBe(0);
    process.env.TRUSTED_PROXY_HOPS = old ?? "";
  });
});
