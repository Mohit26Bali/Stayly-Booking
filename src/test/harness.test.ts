// Smoke test for the integration-test harness itself, and for the database-level protection of bookings.
import { describe, it, expect, afterAll } from "vitest";
import { createTestDatabase } from "./test-db";

const testDb = await createTestDatabase().catch((error) => {
  console.warn("Integration tests skipped:", (error as Error).message);
  return null;
});
const suite = testDb ? describe : describe.skip;

suite("test harness and booking-record protection", () => {
  afterAll(async () => {
    const { prisma } = await import("@/server/db/client");
    await prisma.$disconnect();
    await testDb!.drop();
  });

  it("the app's Prisma client talks to the throwaway schema, not to real data", async () => {
    const { prisma } = await import("@/server/db/client");
    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.hotel.count()).toBe(0);
  });

  it("[regression] a hotel or room that has bookings cannot be deleted (it used to wipe the bookings)", async () => {
    const { prisma } = await import("@/server/db/client");
    const owner = await prisma.user.create({ data: { email: "o@t.example", role: "HOTEL_OWNER" } });
    const guest = await prisma.user.create({ data: { email: "g@t.example" } });
    const hotel = await prisma.hotel.create({
      data: { ownerId: owner.id, name: "H", slug: "h", description: "d".repeat(30), addressLine: "a", city: "c", country: "IN", status: "APPROVED" },
    });
    const room = await prisma.room.create({ data: { hotelId: hotel.id, name: "R", pricePerNight: 1000 } });
    const booking = await prisma.booking.create({
      data: {
        bookingRef: "STY-TEST0001", userId: guest.id, hotelId: hotel.id, roomId: room.id,
        checkIn: new Date("2030-01-10"), checkOut: new Date("2030-01-12"), subtotal: 2000, totalAmount: 2240, currency: "INR",
        payments: { create: { provider: "RAZORPAY", amount: 2240, currency: "INR", status: "SUCCEEDED" } },
      },
    });
    await expect(prisma.room.delete({ where: { id: room.id } })).rejects.toThrow();
    await expect(prisma.hotel.delete({ where: { id: hotel.id } })).rejects.toThrow();
    expect(await prisma.booking.count({ where: { id: booking.id } })).toBe(1);
    expect(await prisma.payment.count({ where: { bookingId: booking.id } })).toBe(1);
  });
});
