// Integration tests: the REAL booking / payment / auth code against a throwaway PostgreSQL schema
// (created and dropped by test-db.ts; skipped if PostgreSQL is unreachable). Only the outside world is faked:
// the payment providers (Razorpay / Stripe), Redis (the rate limiter falls back to memory) and e-mail.
// Run: npx vitest run
import { createHmac } from "node:crypto";
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { createTestDatabase } from "./test-db";

// ---------- fakes for the outside world ----------
const rz = vi.hoisted(() => ({
  configured: false,
  orderSeq: 0,
  createOrder: vi.fn(),
  refund: vi.fn(),
}));
const st = vi.hoisted(() => ({
  configured: false,
  createSession: vi.fn(),
  refund: vi.fn(),
  nextEvent: null as unknown,
}));

vi.mock("@/server/payments/razorpay", async () => {
  const actual = await vi.importActual<typeof import("@/server/payments/razorpay")>("@/server/payments/razorpay");
  const { createHmac: hmac } = await import("node:crypto");
  return {
    ...actual,
    get isRazorpayConfigured() {
      return rz.configured;
    },
    createRazorpayOrder: (...args: unknown[]) => rz.createOrder(...args),
    refundRazorpayPayment: (...args: unknown[]) => rz.refund(...args),
    // same algorithm as the real one, with a known test secret
    verifyRazorpaySignature: (p: { orderId: string; paymentId: string; signature: string }) =>
      hmac("sha256", "test_secret").update(`${p.orderId}|${p.paymentId}`).digest("hex") === p.signature,
  };
});
vi.mock("@/server/payments/stripe", () => ({
  get isStripeConfigured() {
    return st.configured;
  },
  createStripeCheckoutSession: (...args: unknown[]) => st.createSession(...args),
  refundStripeCheckoutSession: (...args: unknown[]) => st.refund(...args),
  constructStripeWebhookEvent: () => {
    if (!st.nextEvent) throw new Error("bad signature");
    return st.nextEvent;
  },
}));
vi.mock("@/server/db/redis", () => ({
  redis: {
    incr: async () => {
      throw new Error("no redis in tests");
    },
    expire: async () => 0,
    get: async () => {
      throw new Error("no redis in tests");
    },
  },
}));
vi.mock("@/server/email/resend", () => ({
  sendVerificationEmail: vi.fn(async () => undefined),
  sendPasswordResetEmail: vi.fn(async () => undefined),
}));

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 });

const testDb = await createTestDatabase().catch((error) => {
  console.warn("Integration tests skipped:", (error as Error).message);
  return null;
});

async function loadModules() {
  const [db, bookings, hotels, reviews, coupons, auth, loginRoute, stripeHook, rzHook, cron, schema] = await Promise.all([
    import("@/server/db/client"),
    import("@/server/bookings/service"),
    import("@/server/hotels/service"),
    import("@/server/reviews/service"),
    import("@/server/coupons/service"),
    import("@/server/auth/service"),
    import("@/app/api/auth/login/route"),
    import("@/app/api/webhooks/stripe/route"),
    import("@/app/api/webhooks/razorpay/route"),
    import("@/app/api/cron/expire-bookings/route"),
    import("@/features/auth/schemas/auth.schema"),
  ]);
  return { prisma: db.prisma, bookings, hotels, reviews, coupons, auth, loginRoute, stripeHook, rzHook, cron, schema };
}
const M = testDb ? await loadModules() : null;
const suite = M ? describe : describe.skip;

const DAY = 86_400_000;
const ymd = (daysFromNow: number) => new Date(Date.now() + daysFromNow * DAY).toISOString().slice(0, 10);
const sign = (orderId: string, paymentId: string) =>
  createHmac("sha256", "test_secret").update(`${orderId}|${paymentId}`).digest("hex");

suite("Stayly - real booking, payment and auth flows on a throwaway database", () => {
  const m = M!;
  const prisma = m.prisma;
  let seq = 0;
  let passwordHash = "";

  beforeAll(async () => {
    const bcrypt = (await import("bcryptjs")).default;
    passwordHash = await bcrypt.hash("Str0ngPassw0rd", 4);
  });
  afterAll(async () => {
    await prisma.$disconnect();
    await testDb!.drop();
  });

  // ---------- helpers ----------
  async function makeUser(role: "CUSTOMER" | "HOTEL_OWNER" | "ADMIN" = "CUSTOMER", extra: Record<string, unknown> = {}) {
    seq += 1;
    return prisma.user.create({
      data: { email: `user${seq}@test.example`, passwordHash, role, profile: { create: { firstName: "T", lastName: `U${seq}` } }, ...extra },
    });
  }
  async function makeHotel(ownerId: string, status: "APPROVED" | "PENDING" | "SUSPENDED" = "APPROVED") {
    seq += 1;
    return prisma.hotel.create({
      data: { ownerId, name: `Hotel ${seq}`, slug: `hotel-${seq}`, description: "d".repeat(40), addressLine: "1 Road", city: "Pune", country: "IN", status },
    });
  }
  async function makeRoom(hotelId: string, extra: Record<string, unknown> = {}) {
    seq += 1;
    return prisma.room.create({ data: { hotelId, name: `Room ${seq}`, pricePerNight: 5000, maxGuests: 2, totalUnits: 1, ...extra } });
  }
  /** owner + approved hotel + one room, ready to book */
  async function makeListing(roomExtra: Record<string, unknown> = {}) {
    const owner = await makeUser("HOTEL_OWNER");
    const hotel = await makeHotel(owner.id);
    const room = await makeRoom(hotel.id, roomExtra);
    return { owner, hotel, room };
  }
  const input = (roomId: string, extra: Record<string, unknown> = {}) => ({
    roomId, checkIn: ymd(10), checkOut: ymd(12), guestsCount: 2, unitsBooked: 1, guests: [], ...extra,
  });
  const book = (userId: string, roomId: string, extra: Record<string, unknown> = {}) =>
    m.bookings.createBooking(userId, input(roomId, extra) as never);
  const errorOf = async (promise: Promise<unknown>) => {
    try {
      await promise;
      return null;
    } catch (e) {
      return e as { message: string; status?: number };
    }
  };
  const booking = (id: string) => prisma.booking.findUniqueOrThrow({ where: { id }, include: { payments: { include: { transactions: true } } } });
  /** the booking becomes a paid, confirmed one (simulating a finished Razorpay checkout) */
  async function payWithRazorpay(userId: string, bookingId: string, orderId: string, paymentId = "pay_" + bookingId.slice(-6)) {
    return m.bookings.verifyRazorpayPayment(bookingId, userId, { orderId, paymentId, signature: sign(orderId, paymentId) });
  }
  async function resetFakes() {
    rz.configured = false;
    st.configured = false;
    rz.orderSeq = 0;
    rz.createOrder.mockReset().mockImplementation(async () => ({ id: `order_${++rz.orderSeq}_${Math.random().toString(36).slice(2, 8)}` }));
    rz.refund.mockReset().mockResolvedValue({ id: "rfnd_1" });
    st.createSession.mockReset().mockImplementation(async () => ({ id: `cs_${Math.random().toString(36).slice(2, 10)}`, url: "https://checkout.stripe.test/x" }));
    st.refund.mockReset().mockResolvedValue({ id: "re_1" });
    st.nextEvent = null;
  }

  // ====================================================================
  describe("creating a booking", () => {
    it("books and confirms in demo mode with correct INR pricing (5000 x 2 nights + 12% tax)", async () => {
      await resetFakes();
      const { room } = await makeListing();
      const guest = await makeUser();
      const r = await book(guest.id, room.id);
      expect(r.demoMode).toBe(true);
      const b = await booking(r.booking.id);
      expect(b.status).toBe("CONFIRMED");
      expect([Number(b.subtotal), Number(b.taxAmount), Number(b.totalAmount), b.currency]).toEqual([10000, 1200, 11200, "INR"]);
      expect(b.payments[0].status).toBe("SUCCEEDED");
    });

    it("[regression] in PRODUCTION without payment keys bookings are refused, never auto-confirmed for free", async () => {
      await resetFakes();
      const { room } = await makeListing();
      const guest = await makeUser();
      const env = process.env as Record<string, string | undefined>;
      const before = await prisma.booking.count();
      env.NODE_ENV = "production";
      try {
        const e = await errorOf(book(guest.id, room.id));
        expect(e?.status).toBe(503);
        expect(await prisma.booking.count()).toBe(before); // nothing created
        env.ALLOW_DEMO_PAYMENTS = "true"; // an explicit, deliberate opt-in still works (e.g. a public demo site)
        expect((await book(guest.id, room.id)).demoMode).toBe(true);
      } finally {
        env.NODE_ENV = "test";
        delete env.ALLOW_DEMO_PAYMENTS;
      }
    });

    it("[regression] rooms of hotels that are not approved, or switched off, can't be booked", async () => {
      await resetFakes();
      const owner = await makeUser("HOTEL_OWNER");
      const guest = await makeUser();
      for (const status of ["PENDING", "SUSPENDED"] as const) {
        const room = await makeRoom((await makeHotel(owner.id, status)).id);
        expect((await errorOf(book(guest.id, room.id)))?.status).toBe(404);
      }
      const { room: off } = await makeListing({ isAvailable: false });
      expect((await errorOf(book(guest.id, off.id)))?.status).toBe(409);
    });

    it("refuses invalid requests: own property, inactive account, too many guests, bad dates", async () => {
      await resetFakes();
      const { owner, room } = await makeListing({ maxGuests: 2, totalUnits: 3 });
      const guest = await makeUser();
      expect((await errorOf(book(owner.id, room.id)))?.status).toBe(403);
      const banned = await makeUser("CUSTOMER", { isActive: false });
      expect((await errorOf(book(banned.id, room.id)))?.status).toBe(403);
      expect((await errorOf(book(guest.id, room.id, { guestsCount: 3 })))?.status).toBe(422); // sleeps 2
      expect((await book(guest.id, room.id, { guestsCount: 4, unitsBooked: 2 })).booking.id).toBeTruthy(); // 2 units x 2
      expect((await errorOf(book(guest.id, room.id, { guests: [{ fullName: "A" }, { fullName: "B" }, { fullName: "C" }] })))?.status).toBe(422);
      expect((await errorOf(book(guest.id, room.id, { checkIn: ymd(-3), checkOut: ymd(-1) })))?.status).toBe(422);
      expect((await errorOf(book(guest.id, room.id, { checkIn: ymd(10), checkOut: ymd(10) })))?.status).toBe(422);
      expect((await errorOf(book(guest.id, room.id, { checkIn: ymd(10), checkOut: ymd(45) })))?.status).toBe(422); // > 30 nights
      expect((await errorOf(book(guest.id, room.id, { checkIn: ymd(400), checkOut: ymd(402) })))?.status).toBe(422); // > 1 year ahead
    });

    it("never overbooks a room; back-to-back stays are fine", async () => {
      await resetFakes();
      const { room } = await makeListing({ totalUnits: 1 });
      const [a, b, c] = [await makeUser(), await makeUser(), await makeUser()];
      await book(a.id, room.id, { checkIn: ymd(10), checkOut: ymd(12) });
      expect((await errorOf(book(b.id, room.id, { checkIn: ymd(11), checkOut: ymd(13) })))?.status).toBe(409);
      await book(c.id, room.id, { checkIn: ymd(12), checkOut: ymd(14) }); // starts the day the first one leaves
      await book(b.id, room.id, { checkIn: ymd(8), checkOut: ymd(10) }); // ends the day the first one arrives
    });

    it("[regression] six people booking the last room at the same moment: exactly one wins, nobody sees a 500", async () => {
      await resetFakes();
      const { room } = await makeListing({ totalUnits: 1 });
      const guests = await Promise.all([1, 2, 3, 4, 5, 6].map(() => makeUser()));
      const results = await Promise.all(guests.map((g) => errorOf(book(g.id, room.id))));
      expect(results.filter((e) => e === null)).toHaveLength(1);
      for (const e of results.filter((x) => x !== null)) expect(e!.status).toBe(409);
      expect(await prisma.booking.count({ where: { roomId: room.id, status: { in: ["CONFIRMED", "PENDING"] } } })).toBe(1);
    });

    it("[regression] simultaneous bookings of a room that has capacity all succeed (colliding transactions are retried, not failed)", async () => {
      await resetFakes();
      const { room } = await makeListing({ totalUnits: 6 });
      const guests = await Promise.all([1, 2, 3, 4, 5, 6].map(() => makeUser()));
      const results = await Promise.all(guests.map((g) => errorOf(book(g.id, room.id))));
      expect(results.map((e) => e?.message ?? "ok")).toEqual(Array(6).fill("ok"));
      expect(await prisma.booking.count({ where: { roomId: room.id } })).toBe(6);
    });

    it("[regression] unpaid bookings only hold a room while their hold lasts (no inventory lock-out)", async () => {
      await resetFakes();
      rz.configured = true;
      const { room } = await makeListing({ totalUnits: 1 });
      const squatter = await makeUser();
      const real = await makeUser();
      const held = await book(squatter.id, room.id);
      expect(held.booking.status).toBe("PENDING");
      expect((await errorOf(book(real.id, room.id)))?.status).toBe(409); // fresh hold blocks
      await prisma.booking.update({ where: { id: held.booking.id }, data: { createdAt: new Date(Date.now() - 31 * 60_000) } });
      expect((await book(real.id, room.id)).booking.id).toBeTruthy(); // hold lapsed -> room is free again
    });

    it("coupons: percentage discount is capped, can't exceed the amount, is used once, and comes back when unpaid", async () => {
      await resetFakes();
      rz.configured = true;
      const { room } = await makeListing({ totalUnits: 5 });
      const guest = await makeUser();
      await prisma.coupon.create({ data: { code: "BIG50", type: "PERCENTAGE", value: 50, maxDiscountAmount: 1000, maxUsesPerUser: 1 } });
      await prisma.coupon.create({ data: { code: "MIN", type: "FIXED", value: 100, minBookingAmount: 999999 } });
      expect((await errorOf(book(guest.id, room.id, { couponCode: "MIN" })))?.message).toMatch(/₹/); // INR, not $
      const r = await book(guest.id, room.id, { couponCode: "BIG50" });
      expect(Number(r.booking.discountAmount)).toBe(1000); // 50% of 11200 = 5600, capped at 1000
      expect(Number(r.booking.totalAmount)).toBe(10200);
      expect((await errorOf(book(guest.id, room.id, { couponCode: "BIG50" })))?.message).toMatch(/already used/);
      // not paid: cancelling gives the coupon back
      await m.bookings.cancelBooking(r.booking.id, guest.id);
      expect((await book(guest.id, room.id, { couponCode: "BIG50" })).booking.id).toBeTruthy();
    });

    it("[regression] if the payment provider fails right after the booking is created, nothing is left holding the room", async () => {
      await resetFakes();
      rz.configured = true;
      rz.createOrder.mockRejectedValueOnce(new Error("razorpay down"));
      const { room } = await makeListing({ totalUnits: 1 });
      const guest = await makeUser();
      await prisma.coupon.create({ data: { code: "ONCE", type: "FIXED", value: 100 } });
      const e = await errorOf(book(guest.id, room.id, { couponCode: "ONCE" }));
      expect(e?.status).toBe(502);
      const left = await prisma.booking.findMany({ where: { roomId: room.id } });
      expect(left.map((b) => b.status)).toEqual(["EXPIRED"]);
      expect((await book(guest.id, room.id, { couponCode: "ONCE" })).booking.id).toBeTruthy(); // room AND coupon are free again
    });
  });

  // ====================================================================
  describe("payments", () => {
    async function pendingRazorpay() {
      await resetFakes();
      rz.configured = true;
      const { owner, hotel, room } = await makeListing({ totalUnits: 1 });
      const guest = await makeUser();
      const r = await book(guest.id, room.id);
      return { owner, hotel, room, guest, bookingId: r.booking.id, orderId: r.razorpay!.orderId };
    }

    it("Razorpay: a correctly signed payment confirms the booking exactly once, repeating it is harmless", async () => {
      const { guest, bookingId, orderId } = await pendingRazorpay();
      expect((await booking(bookingId)).status).toBe("PENDING");
      await payWithRazorpay(guest.id, bookingId, orderId, "pay_ABC");
      await payWithRazorpay(guest.id, bookingId, orderId, "pay_ABC"); // browser retry / double click
      const b = await booking(bookingId);
      expect(b.status).toBe("CONFIRMED");
      expect(b.payments[0].status).toBe("SUCCEEDED");
      expect(b.payments[0].providerRef).toBe("pay_ABC");
      expect(b.payments[0].transactions.filter((t) => t.type === "PAYMENT")).toHaveLength(1);
      expect(rz.refund).not.toHaveBeenCalled();
    });

    it("Razorpay: a forged signature or someone else's booking confirms nothing", async () => {
      const { guest, bookingId, orderId } = await pendingRazorpay();
      const forged = await errorOf(m.bookings.verifyRazorpayPayment(bookingId, guest.id, { orderId, paymentId: "pay_X", signature: "00".repeat(32) }));
      expect(forged?.status).toBe(400);
      const stranger = await makeUser();
      const other = await errorOf(m.bookings.verifyRazorpayPayment(bookingId, stranger.id, { orderId, paymentId: "pay_X", signature: sign(orderId, "pay_X") }));
      expect(other?.status).toBe(404);
      expect((await booking(bookingId)).status).toBe("PENDING");
    });

    it("[regression] payment arriving after the hold lapsed: confirmed if the room is still free, refunded if it was taken", async () => {
      const a = await pendingRazorpay();
      await prisma.booking.update({ where: { id: a.bookingId }, data: { createdAt: new Date(Date.now() - 45 * 60_000) } });
      await payWithRazorpay(a.guest.id, a.bookingId, a.orderId, "pay_LATE1");
      expect((await booking(a.bookingId)).status).toBe("CONFIRMED"); // nobody else wanted it

      const b = await pendingRazorpay();
      await prisma.booking.update({ where: { id: b.bookingId }, data: { createdAt: new Date(Date.now() - 45 * 60_000) } });
      const rival = await makeUser();
      await book(rival.id, b.room.id); // takes the room while the first guest was away
      const e = await errorOf(payWithRazorpay(b.guest.id, b.bookingId, b.orderId, "pay_LATE2"));
      expect(e?.status).toBe(409);
      expect(e?.message).toMatch(/refunded/);
      expect(rz.refund).toHaveBeenCalledWith("pay_LATE2", 11200, expect.any(String));
      const after = await booking(b.bookingId);
      expect(after.status).not.toBe("CONFIRMED");
      expect(after.payments[0].status).toBe("REFUNDED");
      expect(after.payments[0].transactions.map((t) => t.type).sort()).toEqual(["PAYMENT", "REFUND"]);
      expect(await prisma.booking.count({ where: { roomId: b.room.id, status: "CONFIRMED" } })).toBe(0); // no overbooking
    });

    it("[regression] a payment for a booking the guest already cancelled is refunded, not used to revive it", async () => {
      const { guest, bookingId, orderId } = await pendingRazorpay();
      await m.bookings.cancelBooking(bookingId, guest.id);
      const e = await errorOf(payWithRazorpay(guest.id, bookingId, orderId, "pay_AFTERCANCEL"));
      expect(e?.status).toBe(409);
      expect(rz.refund).toHaveBeenCalledTimes(1);
      expect((await booking(bookingId)).status).toBe("CANCELLED");
    });

    function rzEvent(overrides: Record<string, unknown> = {}) {
      return { event: "payment.captured", payload: { payment: { entity: { id: "pay_WH1", order_id: "", amount: 1120000, currency: "INR", status: "captured", ...overrides } } } };
    }
    async function callRzHook(body: unknown, signature?: string | null) {
      const raw = JSON.stringify(body);
      const sig = signature === undefined ? createHmac("sha256", "wh_secret").update(raw).digest("hex") : signature;
      return m.rzHook.POST(new NextRequest("http://localhost/api/webhooks/razorpay", { method: "POST", body: raw, headers: sig ? { "x-razorpay-signature": sig } : {} }));
    }

    it("[regression] Razorpay webhook confirms a paid booking even though the guest closed the browser; replays and bad calls are safe", async () => {
      const { bookingId, orderId } = await pendingRazorpay();
      process.env.RAZORPAY_WEBHOOK_SECRET = "wh_secret";
      try {
        expect((await callRzHook(rzEvent({ order_id: orderId }), "00".repeat(32))).status).toBe(400); // wrong signature
        expect((await callRzHook(rzEvent({ order_id: orderId, amount: 100 }))).status).toBe(200); // wrong amount: ignored
        expect((await booking(bookingId)).status).toBe("PENDING");
        expect((await callRzHook(rzEvent({ order_id: orderId, status: "failed" }))).status).toBe(200); // not captured: ignored
        expect((await booking(bookingId)).status).toBe("PENDING");
        expect((await callRzHook(rzEvent({ order_id: orderId }))).status).toBe(200);
        expect((await callRzHook(rzEvent({ order_id: orderId }))).status).toBe(200); // Razorpay retries
        const b = await booking(bookingId);
        expect(b.status).toBe("CONFIRMED");
        expect(b.payments[0].transactions).toHaveLength(1);
        expect((await callRzHook({ event: "refund.created" })).status).toBe(200); // other events: ignored
      } finally {
        delete process.env.RAZORPAY_WEBHOOK_SECRET;
      }
      expect((await callRzHook(rzEvent())).status).toBe(503); // no secret configured -> refuses everything
    });

    it("Stripe: starts a Checkout session; the webhook confirms only a PAID session of the right amount, once", async () => {
      await resetFakes();
      st.configured = true;
      const { room } = await makeListing();
      const guest = await makeUser();
      const r = await book(guest.id, room.id);
      expect(r.checkoutUrl).toMatch(/^https:/);
      const sessionId = (await prisma.payment.findFirstOrThrow({ where: { bookingId: r.booking.id } })).providerRef!;
      const call = (obj: Record<string, unknown>, type = "checkout.session.completed") => {
        st.nextEvent = { type, data: { object: { id: sessionId, metadata: { bookingId: r.booking.id }, payment_status: "paid", amount_total: 1120000, currency: "inr", ...obj } } };
        return m.stripeHook.POST(new NextRequest("http://localhost/api/webhooks/stripe", { method: "POST", body: "{}", headers: { "stripe-signature": "t=1,v1=x" } }));
      };
      expect((await call({ payment_status: "unpaid" })).status).toBe(200); // delayed method not paid yet
      expect((await call({ amount_total: 100 })).status).toBe(200); // amount mismatch
      expect((await booking(r.booking.id)).status).toBe("PENDING");
      expect((await call({})).status).toBe(200);
      expect((await call({})).status).toBe(200); // Stripe delivers events more than once
      const b = await booking(r.booking.id);
      expect(b.status).toBe("CONFIRMED");
      expect(b.payments[0].transactions).toHaveLength(1);
      st.nextEvent = null;
      expect((await m.stripeHook.POST(new NextRequest("http://localhost/api/webhooks/stripe", { method: "POST", body: "{}", headers: { "stripe-signature": "bad" } }))).status).toBe(400);
    });
  });

  // ====================================================================
  describe("cancellation and refunds", () => {
    async function confirmedBooking(checkInDays: number) {
      await resetFakes();
      rz.configured = true;
      const { room } = await makeListing({ totalUnits: 2 });
      const guest = await makeUser();
      const r = await book(guest.id, room.id, { checkIn: ymd(checkInDays), checkOut: ymd(checkInDays + 2) });
      await payWithRazorpay(guest.id, r.booking.id, r.razorpay!.orderId, "pay_C" + Math.random().toString(36).slice(2, 7));
      return { guest, room, id: r.booking.id };
    }

    it("[regression] cancelling a paid booking more than 48h ahead really refunds the money through the provider", async () => {
      const { guest, id } = await confirmedBooking(10);
      const paymentRef = (await booking(id)).payments[0].providerRef!;
      const result = await m.bookings.cancelBooking(id, guest.id, "plans changed");
      expect(result.refund).toEqual({ status: "refunded", amount: 11200 });
      expect(rz.refund).toHaveBeenCalledWith(paymentRef, 11200, expect.any(String));
      const b = await booking(id);
      expect(b.status).toBe("CANCELLED");
      expect(b.payments[0].status).toBe("REFUNDED");
      expect(b.payments[0].transactions.map((t) => t.type).sort()).toEqual(["PAYMENT", "REFUND"]);
      expect(b.specialRequests).toContain("plans changed");
    });

    it("cancelling inside the free-cancellation window is allowed but not refunded (window is configurable)", async () => {
      const { guest, id } = await confirmedBooking(1); // tomorrow: < 48h
      const result = await m.bookings.cancelBooking(id, guest.id);
      expect(result.refund.status).toBe("not_eligible");
      expect(rz.refund).not.toHaveBeenCalled();
      expect((await booking(id)).payments[0].status).toBe("SUCCEEDED"); // honest: the money was NOT returned
      const again = await confirmedBooking(1);
      process.env.FREE_CANCELLATION_HOURS = "0";
      try {
        expect((await m.bookings.cancelBooking(again.id, again.guest.id)).refund.status).toBe("refunded");
      } finally {
        delete process.env.FREE_CANCELLATION_HOURS;
      }
    });

    it("a stay that has already started can't be cancelled online; other people's and finished bookings can't be touched", async () => {
      const { guest, id } = await confirmedBooking(0);
      expect((await errorOf(m.bookings.cancelBooking(id, guest.id)))?.status).toBe(400);
      const future = await confirmedBooking(10);
      expect((await errorOf(m.bookings.cancelBooking(future.id, (await makeUser()).id)))?.status).toBe(404);
      await m.bookings.cancelBooking(future.id, future.guest.id);
      expect((await errorOf(m.bookings.cancelBooking(future.id, future.guest.id)))?.status).toBe(400); // already cancelled
    });

    it("cancelling an unpaid booking just releases it (no refund, payment marked failed, room free again)", async () => {
      await resetFakes();
      rz.configured = true;
      const { room } = await makeListing({ totalUnits: 1 });
      const guest = await makeUser();
      const r = await book(guest.id, room.id);
      const result = await m.bookings.cancelBooking(r.booking.id, guest.id);
      expect(result.refund.status).toBe("none");
      expect(rz.refund).not.toHaveBeenCalled();
      expect((await booking(r.booking.id)).payments[0].status).toBe("FAILED");
      expect((await book((await makeUser()).id, room.id)).booking.id).toBeTruthy();
    });

    it("[regression] if the provider can't refund right now the booking is still cancelled, the payment is NOT falsely marked refunded, and a retry works", async () => {
      const { guest, id } = await confirmedBooking(10);
      rz.refund.mockRejectedValueOnce(new Error("gateway timeout"));
      const result = await m.bookings.cancelBooking(id, guest.id);
      expect(result.refund.status).toBe("pending");
      const stuck = await booking(id);
      expect(stuck.status).toBe("CANCELLED");
      expect(stuck.payments[0].status).toBe("SUCCEEDED");
      expect(await m.bookings.refundPayment(stuck.payments[0].id, "retry")).toBe(true);
      expect((await booking(id)).payments[0].status).toBe("REFUNDED");
      expect(await m.bookings.refundPayment(stuck.payments[0].id, "again")).toBe(true); // idempotent
      expect(rz.refund).toHaveBeenCalledTimes(2); // failed attempt + the successful retry, never a third
    });

    it("[regression] a double click on Cancel refunds exactly once", async () => {
      const { guest, id } = await confirmedBooking(10);
      const results = await Promise.all([1, 2, 3].map(() => errorOf(m.bookings.cancelBooking(id, guest.id))));
      expect(results.filter((e) => e === null)).toHaveLength(1);
      expect(rz.refund).toHaveBeenCalledTimes(1);
    });
  });

  // ====================================================================
  describe("housekeeping: expiring unpaid bookings", () => {
    it("expires only stale unpaid bookings; paid and fresh ones are left alone", async () => {
      await resetFakes();
      rz.configured = true;
      const { room } = await makeListing({ totalUnits: 5 });
      const [g1, g2, g3] = [await makeUser(), await makeUser(), await makeUser()];
      const stale = await book(g1.id, room.id);
      const fresh = await book(g2.id, room.id);
      const paid = await book(g3.id, room.id);
      await payWithRazorpay(g3.id, paid.booking.id, paid.razorpay!.orderId, "pay_KEEP");
      for (const id of [stale.booking.id, paid.booking.id]) {
        await prisma.booking.update({ where: { id }, data: { createdAt: new Date(Date.now() - 2 * 3_600_000) } });
      }
      await m.bookings.expireStaleBookings();
      expect((await booking(stale.booking.id)).status).toBe("EXPIRED");
      expect((await booking(stale.booking.id)).payments[0].status).toBe("FAILED");
      expect((await booking(fresh.booking.id)).status).toBe("PENDING");
      expect((await booking(paid.booking.id)).status).toBe("CONFIRMED");
    });

    it("the cron endpoint needs the secret", async () => {
      const call = (auth?: string) => m.cron.POST(new NextRequest("http://localhost/api/cron/expire-bookings", { method: "POST", headers: auth ? { authorization: auth } : {} }));
      expect((await call()).status).toBe(503); // not configured
      process.env.CRON_SECRET = "cron_secret_value";
      try {
        expect((await call()).status).toBe(401);
        expect((await call("Bearer wrong")).status).toBe(401);
        const ok = await call("Bearer cron_secret_value");
        expect(ok.status).toBe(200);
        expect(await ok.json()).toEqual({ expired: expect.any(Number) });
      } finally {
        delete process.env.CRON_SECRET;
      }
    });
  });

  // ====================================================================
  describe("hotels and rooms", () => {
    it("[regression] a hotel or room that has bookings can't be deleted, so guests' reservations and payments survive", async () => {
      await resetFakes();
      const { owner, hotel, room } = await makeListing({ totalUnits: 2 });
      const guest = await makeUser();
      const r = await book(guest.id, room.id);
      expect((await errorOf(m.hotels.deleteRoom(hotel.id, room.id, { id: owner.id, role: "HOTEL_OWNER" })))?.status).toBe(409);
      expect((await errorOf(m.hotels.deleteHotel(hotel.id, { id: owner.id, role: "HOTEL_OWNER" })))?.status).toBe(409);
      expect((await booking(r.booking.id)).payments).toHaveLength(1);
      // an unused room and hotel can still be deleted
      const empty = await makeRoom(hotel.id);
      await m.hotels.deleteRoom(hotel.id, empty.id, { id: owner.id, role: "HOTEL_OWNER" });
      const { owner: o2, hotel: h2 } = await makeListing();
      await prisma.room.deleteMany({ where: { hotelId: h2.id } });
      await m.hotels.deleteHotel(h2.id, { id: o2.id, role: "HOTEL_OWNER" });
    });

    it("only the owner (or an admin) can change a hotel; owners can switch a room off and can't squeeze it below upcoming bookings", async () => {
      await resetFakes();
      const { owner, hotel, room } = await makeListing({ totalUnits: 3 });
      const stranger = await makeUser("HOTEL_OWNER");
      expect((await errorOf(m.hotels.updateRoom(hotel.id, room.id, { id: stranger.id, role: "HOTEL_OWNER" }, { name: "Hacked" })))?.status).toBe(403);
      const [g1, g2] = [await makeUser(), await makeUser()];
      await book(g1.id, room.id);
      await book(g2.id, room.id);
      const e = await errorOf(m.hotels.updateRoom(hotel.id, room.id, { id: owner.id, role: "HOTEL_OWNER" }, { totalUnits: 1 }));
      expect(e?.status).toBe(409);
      await m.hotels.updateRoom(hotel.id, room.id, { id: owner.id, role: "HOTEL_OWNER" }, { totalUnits: 2 });
      await m.hotels.updateRoom(hotel.id, room.id, { id: owner.id, role: "HOTEL_OWNER" }, { isAvailable: false });
      expect((await errorOf(book((await makeUser()).id, room.id, { checkIn: ymd(40), checkOut: ymd(41) })))?.status).toBe(409);
    });
  });

  // ====================================================================
  describe("reviews", () => {
    it("[regression] reviewing twice at the same moment gives one review and one polite error, not a crash", async () => {
      await resetFakes();
      const { room } = await makeListing();
      const guest = await makeUser();
      const r = await book(guest.id, room.id);
      await prisma.booking.update({ where: { id: r.booking.id }, data: { checkIn: new Date(ymd(-5)), checkOut: new Date(ymd(-3)) } });
      const results = await Promise.all([1, 2, 3].map(() => errorOf(m.reviews.createReview(guest.id, { bookingId: r.booking.id, rating: 5, comment: "Lovely stay indeed" }))));
      expect(results.filter((e) => e === null)).toHaveLength(1);
      for (const e of results.filter((x) => x !== null)) expect(e!.status).toBe(409);
    });
  });

  // ====================================================================
  describe("accounts and sign-in", () => {
    const registerInput = (email: string) => ({ firstName: "Ada", lastName: "L", email, password: "Str0ngPassw0rd" }) as never;

    it("e-mail addresses are case-insensitive: no duplicate accounts, and login works in any case", async () => {
      const email = m.schema.emailSchema.parse("  New.Guest@Test.Example ");
      expect(email).toBe("new.guest@test.example");
      await m.auth.registerUser(registerInput(email));
      expect((await errorOf(m.auth.registerUser(registerInput("NEW.GUEST@test.example"))))?.status).toBe(409);
      const user = await m.auth.authenticateUser({ email: "NEW.guest@Test.example", password: "Str0ngPassw0rd" });
      expect(user.email).toBe("new.guest@test.example");
      // two sign-ups at the same instant: one account
      const results = await Promise.all([1, 2, 3].map(() => errorOf(m.auth.registerUser(registerInput("race@test.example")))));
      expect(results.filter((e) => e === null)).toHaveLength(1);
      for (const e of results.filter((x) => x !== null)) expect(e!.status).toBe(409);
    });

    it("passwords: too common, too long (bcrypt ignores > 72) and weak ones are refused", () => {
      const ok = (p: string) => m.schema.passwordSchema.safeParse(p).success;
      expect(ok("Str0ngPassw0rd")).toBe(true);
      expect(ok("Password123")).toBe(false); // common
      expect(ok("Admin@123")).toBe(false);
      expect(ok("short1A")).toBe(false);
      expect(ok("A1" + "a".repeat(80))).toBe(false); // > 72
    });

    const loginCall = (email: string, password: string, headers: Record<string, string> = {}) =>
      m.loginRoute.POST(new NextRequest("http://localhost/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }), headers }));

    it("[regression] after 8 wrong passwords an account is locked for the window - even if the attacker forges X-Forwarded-For", async () => {
      const u = await makeUser();
      for (let i = 0; i < 8; i++) {
        const res = await loginCall(u.email, "wrong-password", { "x-forwarded-for": `9.9.9.${i}` }); // a "new" IP every time
        expect(res.status).toBe(401);
      }
      expect((await loginCall(u.email, "wrong-password", { "x-forwarded-for": "1.1.1.1" })).status).toBe(429);
      expect((await loginCall(u.email, "Str0ngPassw0rd", { "x-forwarded-for": "2.2.2.2" })).status).toBe(429); // even the right one
      const other = await makeUser();
      const good = await loginCall(other.email, "Str0ngPassw0rd");
      expect(good.status).toBe(200); // other accounts are unaffected
      expect(good.headers.get("set-cookie")).toContain("stayly_access_token");
    });

    it("unknown accounts and wrong passwords give the same answer", async () => {
      const u = await makeUser();
      const a = await loginCall("nobody@test.example", "Whatever1A");
      const b = await loginCall(u.email, "Whatever1A");
      expect(a.status).toBe(401);
      expect(await a.json()).toEqual(await b.json());
    });

    it("password reset links work once (even when used twice at once), and reset signs out every session", async () => {
      const u = await makeUser();
      const tokens = await m.auth.issueAuthTokens(await m.auth.getPublicUserById(u.id) as never);
      const { generateRawToken, hashToken } = await import("@/server/auth/tokens");
      const raw = generateRawToken();
      await prisma.passwordResetToken.create({ data: { userId: u.id, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + 3_600_000) } });
      const results = await Promise.all([1, 2, 3].map((i) => errorOf(m.auth.resetPassword(raw, `Brand-New-Passw0rd-${i}`))));
      expect(results.filter((e) => e === null)).toHaveLength(1);
      expect(await prisma.refreshToken.count({ where: { userId: u.id, revoked: false } })).toBe(0);
      expect((await errorOf(m.auth.rotateRefreshToken(tokens.refreshToken)))?.status).toBe(401);
    });

    it("a refresh token can be used only once, even by two parallel requests", async () => {
      const u = await makeUser();
      const tokens = await m.auth.issueAuthTokens(await m.auth.getPublicUserById(u.id) as never);
      const results = await Promise.all([1, 2, 3].map(() => errorOf(m.auth.rotateRefreshToken(tokens.refreshToken))));
      expect(results.filter((e) => e === null)).toHaveLength(1);
    });
  });
});
