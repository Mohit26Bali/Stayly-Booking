import { prisma, faker, addDays, round2, nextBookingRef, log } from "./lib";
import type { Booking, Room, User } from "../../src/generated/prisma/client";

const TAX_RATE = 0.12;

const SPECIAL_REQUESTS = [
  "Requesting a high floor room if possible.",
  "Celebrating an anniversary — a small surprise would be lovely.",
  "Early check-in around 10am if the room is ready.",
  "Late check-out requested, flight is in the evening.",
  "Traveling with a toddler, a crib would help.",
  "Would appreciate a quiet room away from the elevator.",
  "Vegetarian breakfast options please.",
  null,
  null,
  null,
];

interface BookedInterval {
  checkIn: Date;
  checkOut: Date;
  units: number;
}

interface StatusPlan {
  status: "COMPLETED" | "CONFIRMED" | "PENDING" | "CANCELLED" | "REFUNDED";
  count: number;
}

/** Reference ratio (sums to 150) — actual counts are scaled to the requested total. */
const STATUS_RATIOS: Array<Pick<StatusPlan, "status" | "count">> = [
  { status: "COMPLETED", count: 60 },
  { status: "CONFIRMED", count: 45 },
  { status: "PENDING", count: 20 },
  { status: "CANCELLED", count: 20 },
  { status: "REFUNDED", count: 5 },
];
const STATUS_RATIO_TOTAL = STATUS_RATIOS.reduce((sum, r) => sum + r.count, 0);

function buildStatusPlan(totalTarget: number): StatusPlan[] {
  return STATUS_RATIOS.map((r) => ({
    status: r.status,
    count: Math.max(1, Math.round((r.count / STATUS_RATIO_TOTAL) * totalTarget)),
  }));
}

function overlaps(a: BookedInterval, checkIn: Date, checkOut: Date): boolean {
  return a.checkIn < checkOut && a.checkOut > checkIn;
}

function unitsBookedOn(intervals: BookedInterval[], checkIn: Date, checkOut: Date): number {
  return intervals.filter((i) => overlaps(i, checkIn, checkOut)).reduce((sum, i) => sum + i.units, 0);
}

/** Picks a check-in/check-out pair for the given "recency" bucket that fits within the room's remaining capacity. */
function pickDateRange(bucket: "past" | "current" | "future", now: Date): { checkIn: Date; checkOut: Date } {
  const nights = faker.number.int({ min: 1, max: 6 });

  if (bucket === "past") {
    const daysAgo = faker.number.int({ min: nights + 3, max: 240 });
    const checkIn = addDays(now, -daysAgo);
    return { checkIn, checkOut: addDays(checkIn, nights) };
  }

  if (bucket === "current") {
    const startedDaysAgo = faker.number.int({ min: 0, max: Math.max(1, nights - 1) });
    const checkIn = addDays(now, -startedDaysAgo);
    return { checkIn, checkOut: addDays(checkIn, nights) };
  }

  const daysAhead = faker.number.int({ min: 2, max: 180 });
  const checkIn = addDays(now, daysAhead);
  return { checkIn, checkOut: addDays(checkIn, nights) };
}

function bucketForStatus(status: StatusPlan["status"]): "past" | "current" | "future" {
  switch (status) {
    case "COMPLETED":
      return "past";
    case "PENDING":
      return faker.datatype.boolean({ probability: 0.8 }) ? "future" : "current";
    case "CANCELLED":
    case "REFUNDED":
      return faker.helpers.arrayElement(["past", "future"]);
    case "CONFIRMED":
      // Weighted so a good chunk of "confirmed" stays already happened —
      // these become review-eligible alongside COMPLETED bookings, matching
      // the app's real review-eligibility rule (status CONFIRMED/COMPLETED + past checkout).
      return faker.helpers.weightedArrayElement([
        { value: "past", weight: 4 },
        { value: "current", weight: 2 },
        { value: "future", weight: 4 },
      ]);
  }
}

export interface SeedBookingsResult {
  bookings: Booking[];
  /** Bookings eligible for a review under the app's real rule: COMPLETED, or CONFIRMED with checkout in the past. */
  reviewEligible: Booking[];
}

export async function seedBookings(
  customers: User[],
  rooms: Room[],
  tierTag: string,
  totalTarget = 150,
): Promise<SeedBookingsResult> {
  const statusPlan = buildStatusPlan(totalTarget);
  log(`Seeding ${totalTarget} bookings across ${rooms.length} rooms`);

  const now = new Date(new Date().toDateString());
  const intervalsByRoom = new Map<string, BookedInterval[]>();
  const bookings: Booking[] = [];
  const reviewEligible: Booking[] = [];

  for (const plan of statusPlan) {
    let created = 0;
    let attempts = 0;
    const maxAttempts = plan.count * 20;

    while (created < plan.count && attempts < maxAttempts) {
      attempts += 1;
      const room = faker.helpers.arrayElement(rooms);
      const customer = faker.helpers.arrayElement(customers);
      const bucket = bucketForStatus(plan.status);
      const { checkIn, checkOut } = pickDateRange(bucket, now);
      const units = 1;

      // Only PENDING/CONFIRMED bookings are tracked here, so this only checks
      // against capacity that's actually held (see the push below).
      const existing = intervalsByRoom.get(room.id) ?? [];
      if (unitsBookedOn(existing, checkIn, checkOut) + units > room.totalUnits) {
        continue;
      }

      const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
      const subtotal = round2(Number(room.pricePerNight) * nights * units);
      const taxAmount = round2(subtotal * TAX_RATE);
      const totalAmount = round2(subtotal + taxAmount);

      const adults = faker.number.int({ min: 1, max: Math.max(1, room.maxGuests - (room.maxGuests > 2 ? 1 : 0)) });
      const children = room.maxGuests > 2 && faker.datatype.boolean({ probability: 0.3 }) ? faker.number.int({ min: 1, max: room.maxGuests - adults }) : 0;

      // A booking is made some days before check-in — never in the future relative to "now".
      const leadDays = faker.number.int({ min: 1, max: 45 });
      const createdAt = new Date(Math.min(addDays(checkIn, -leadDays).getTime(), now.getTime()));

      const booking = await prisma.booking.create({
        data: {
          bookingRef: nextBookingRef(tierTag),
          userId: customer.id,
          hotelId: room.hotelId,
          roomId: room.id,
          checkIn,
          checkOut,
          guestsCount: adults + children,
          adults,
          children,
          unitsBooked: units,
          status: plan.status,
          subtotal,
          taxAmount,
          discountAmount: 0,
          totalAmount,
          specialRequests: faker.helpers.arrayElement(SPECIAL_REQUESTS) ?? undefined,
          createdAt,
          updatedAt: createdAt,
        },
      });

      bookings.push(booking);

      if (plan.status === "COMPLETED" || (plan.status === "CONFIRMED" && checkOut < now)) {
        reviewEligible.push(booking);
      }

      // Only PENDING/CONFIRMED bookings actually hold room capacity going forward.
      if (plan.status === "PENDING" || plan.status === "CONFIRMED") {
        intervalsByRoom.set(room.id, [...existing, { checkIn, checkOut, units }]);
      }

      created += 1;
    }

    log(`  ${plan.status}: ${created}/${plan.count}`);
  }

  return { bookings, reviewEligible };
}
