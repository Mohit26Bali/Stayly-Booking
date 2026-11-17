import { randomBytes } from "node:crypto";
import { differenceInCalendarDays } from "date-fns";
import { prisma } from "@/server/db/client";
import { AuthError } from "@/server/auth/service";
import { isStripeConfigured, createStripeCheckoutSession, refundStripeCheckoutSession } from "@/server/payments/stripe";
import {
  isRazorpayConfigured,
  createRazorpayOrder,
  verifyRazorpaySignature,
  refundRazorpayPayment,
} from "@/server/payments/razorpay";
import { env } from "@/lib/env";
import { validateCoupon } from "@/server/coupons/service";
import { publicUserSelect } from "@/server/db/selects";
import {
  TAX_RATE,
  MAX_STAY_NIGHTS,
  MAX_ADVANCE_DAYS,
  bookingHoldMinutes,
  freeCancellationHours,
  demoPaymentsAllowed,
} from "@/server/bookings/policy";
import type { CreateBookingInput } from "@/features/bookings/schemas/booking.schema";
import type { Prisma } from "@/generated/prisma/client";

function generateBookingRef(): string {
  return `STY-${randomBytes(4).toString("hex").toUpperCase()}`;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Bookings are held for this long while waiting for payment. */
function holdCutoff(now = new Date()): Date {
  return new Date(now.getTime() - bookingHoldMinutes() * 60_000);
}

/** True for the error PostgreSQL raises when two SERIALIZABLE transactions collide (safe to retry). */
function isSerializationFailure(error: unknown): boolean {
  const e = error as { code?: string; message?: string; cause?: { originalCode?: string; code?: string } };
  return (
    e?.code === "P2034" ||
    e?.cause?.originalCode === "40001" ||
    e?.cause?.code === "40001" ||
    /could not serialize|40001|deadlock detected/i.test(e?.message ?? "")
  );
}

/**
 * Runs a SERIALIZABLE transaction and retries it when it loses a race with another booking. Without the retry
 * two people booking the last room at the same moment made one of them see a 500 error.
 */
async function serializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  const attempts = 4;
  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.$transaction(fn, { isolationLevel: "Serializable" });
    } catch (error) {
      if (!isSerializationFailure(error)) throw error;
      if (attempt >= attempts) {
        throw new AuthError("That room is being booked by someone else right now. Please try again.", 409);
      }
      await new Promise((resolve) => setTimeout(resolve, 25 * attempt + Math.random() * 50));
    }
  }
}

async function assertRoomAvailability(
  tx: Prisma.TransactionClient,
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  unitsRequested: number,
  excludeBookingId?: string,
) {
  const room = await tx.room.findUnique({ where: { id: roomId }, include: { hotel: true } });
  // Rooms of hotels that are not approved (pending review, rejected, suspended) can't be booked.
  if (!room || room.hotel.status !== "APPROVED") throw new AuthError("Room not found", 404);
  if (!room.isAvailable) throw new AuthError("This room is not available for booking", 409);

  const overlapping = await tx.booking.findMany({
    where: {
      roomId,
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
      OR: [
        { status: "CONFIRMED" },
        // An unpaid booking only blocks the room while its hold is still running; otherwise anyone could lock
        // a hotel's whole inventory by creating bookings they never pay for.
        { status: "PENDING", createdAt: { gt: holdCutoff() } },
      ],
    },
    select: { unitsBooked: true },
  });

  const unitsTaken = overlapping.reduce((sum, b) => sum + b.unitsBooked, 0);
  if (unitsTaken + unitsRequested > room.totalUnits) {
    throw new AuthError("This room is no longer available for the selected dates", 409);
  }

  return room;
}

/** Gives a coupon use back (an unpaid or failed booking must not burn the guest's one-time coupon). */
async function releaseCoupon(tx: Prisma.TransactionClient, couponId: string | null, userId: string) {
  if (!couponId) return;
  const usage = await tx.couponUsage.findFirst({
    where: { couponId, userId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (usage) await tx.couponUsage.delete({ where: { id: usage.id } });
}

/**
 * Expires unpaid bookings whose hold has run out, frees their coupons and marks their payment attempt failed.
 * Availability already ignores stale holds, so this is housekeeping (and keeps statuses honest); it runs
 * before new bookings, when listing, and from the cron endpoint. Safe to call at any time and in parallel.
 */
export async function expireStaleBookings(now = new Date()): Promise<number> {
  const stale = await prisma.booking.findMany({
    where: {
      status: "PENDING",
      createdAt: { lt: holdCutoff(now) },
      payments: { none: { status: "SUCCEEDED" } },
    },
    select: { id: true, userId: true, couponId: true },
    take: 500,
  });

  let expired = 0;
  for (const booking of stale) {
    await prisma.$transaction(async (tx) => {
      const changed = await tx.booking.updateMany({
        where: { id: booking.id, status: "PENDING" },
        data: { status: "EXPIRED" },
      });
      if (changed.count === 0) return; // paid or cancelled in the meantime
      await tx.payment.updateMany({ where: { bookingId: booking.id, status: "PENDING" }, data: { status: "FAILED" } });
      await releaseCoupon(tx, booking.couponId, booking.userId);
      expired += 1;
    });
  }
  return expired;
}

export async function createBooking(userId: string, input: CreateBookingInput) {
  const checkIn = new Date(input.checkIn);
  const checkOut = new Date(input.checkOut);

  const today = startOfUtcDay(new Date());
  if (checkIn < today) {
    throw new AuthError("Check-in date cannot be in the past", 422);
  }
  const nights = differenceInCalendarDays(checkOut, checkIn);
  if (nights < 1) throw new AuthError("Check-out must be after check-in", 422);
  if (nights > MAX_STAY_NIGHTS) throw new AuthError(`Stays are limited to ${MAX_STAY_NIGHTS} nights`, 422);
  if (differenceInCalendarDays(checkIn, today) > MAX_ADVANCE_DAYS) {
    throw new AuthError("Bookings can be made up to a year in advance", 422);
  }
  if (input.guests.length > input.guestsCount) {
    throw new AuthError("More guest details than guests were provided", 422);
  }

  const account = await prisma.user.findUnique({ where: { id: userId }, select: { isActive: true } });
  if (!account?.isActive) throw new AuthError("This account can't make bookings", 403);

  const provider = isRazorpayConfigured ? "RAZORPAY" : isStripeConfigured ? "STRIPE" : null;
  if (!provider && !demoPaymentsAllowed()) {
    // Never "auto-confirm" in production: a missing/mistyped payment key must stop bookings, not make them free.
    throw new AuthError("Online payments are not available right now. Please try again later.", 503);
  }

  await expireStaleBookings().catch(() => undefined); // housekeeping only

  const result = await serializable(async (tx) => {
    const room = await assertRoomAvailability(tx, input.roomId, checkIn, checkOut, input.unitsBooked);

    if (room.hotel.ownerId === userId) {
      throw new AuthError("You can't book your own property", 403);
    }
    if (input.guestsCount > room.maxGuests * input.unitsBooked) {
      throw new AuthError(
        `This room sleeps at most ${room.maxGuests} guest${room.maxGuests === 1 ? "" : "s"} per unit`,
        422,
      );
    }

    const subtotal = round2(Number(room.pricePerNight) * nights * input.unitsBooked);
    const taxAmount = round2(subtotal * TAX_RATE);

    let discountAmount = 0;
    let couponId: string | undefined;
    if (input.couponCode) {
      const preview = await validateCoupon(input.couponCode, userId, subtotal + taxAmount, tx);
      discountAmount = preview.discountAmount;
      couponId = preview.couponId;
    }

    const totalAmount = Math.max(0, round2(subtotal + taxAmount - discountAmount));

    const booking = await tx.booking.create({
      data: {
        bookingRef: generateBookingRef(),
        userId,
        hotelId: room.hotelId,
        roomId: room.id,
        checkIn,
        checkOut,
        guestsCount: input.guestsCount,
        unitsBooked: input.unitsBooked,
        status: "PENDING",
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        currency: "INR",
        couponId,
        specialRequests: input.specialRequests,
        guests: { createMany: { data: input.guests } },
        payments: {
          create: {
            provider: provider ?? "STRIPE",
            amount: totalAmount,
            taxAmount,
            discountAmount,
            currency: "INR",
            status: "PENDING",
          },
        },
      },
      include: { hotel: true, room: true, payments: true },
    });

    if (couponId) {
      await tx.couponUsage.create({ data: { couponId, userId } });
    }

    return booking;
  });

  const paymentId = result.payments[0].id;

  // If the payment provider can't be reached, don't leave a dead booking holding the room and the coupon.
  const abandon = async (error: unknown): Promise<never> => {
    console.error("Could not start the payment for booking", result.bookingRef, error);
    await prisma
      .$transaction(async (tx) => {
        await tx.booking.updateMany({ where: { id: result.id, status: "PENDING" }, data: { status: "EXPIRED" } });
        await tx.payment.updateMany({ where: { bookingId: result.id, status: "PENDING" }, data: { status: "FAILED" } });
        await releaseCoupon(tx, result.couponId, userId);
      })
      .catch(() => undefined);
    throw new AuthError("We couldn't start the payment. Please try again in a moment.", 502);
  };

  if (provider === "RAZORPAY") {
    try {
      const order = await createRazorpayOrder({
        bookingId: result.id,
        bookingRef: result.bookingRef,
        amount: Number(result.totalAmount),
        currency: "INR",
      });
      await prisma.payment.update({ where: { id: paymentId }, data: { providerRef: order.id } });

      return {
        booking: result,
        checkoutUrl: null,
        demoMode: false,
        razorpay: {
          orderId: order.id,
          amount: Number(result.totalAmount),
          currency: "INR",
          keyId: env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          hotelName: result.hotel.name,
          roomName: result.room.name,
        },
      };
    } catch (error) {
      return abandon(error);
    }
  }

  if (provider === "STRIPE") {
    try {
      const session = await createStripeCheckoutSession({
        bookingId: result.id,
        bookingRef: result.bookingRef,
        hotelName: result.hotel.name,
        roomName: result.room.name,
        amount: Number(result.totalAmount),
        currency: result.currency,
      });
      await prisma.payment.update({ where: { id: paymentId }, data: { providerRef: session.id } });

      return { booking: result, checkoutUrl: session.url, demoMode: false, razorpay: null };
    } catch (error) {
      return abandon(error);
    }
  }

  // No payment provider configured and demo payments are allowed (development): auto-confirm so the booking
  // flow can be demonstrated. Real payments take over once RAZORPAY_KEY_ID/SECRET or STRIPE_SECRET_KEY is set.
  const confirmed = await prisma.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: paymentId }, data: { status: "SUCCEEDED", paidAt: new Date() } });
    return tx.booking.update({
      where: { id: result.id },
      data: { status: "CONFIRMED" },
      include: { hotel: true, room: true },
    });
  });

  return { booking: confirmed, checkoutUrl: null, demoMode: true, razorpay: null };
}

export type ConfirmOutcome = "confirmed" | "already_confirmed" | "refunded" | "refund_pending";

/**
 * Called when a payment provider reports that the guest PAID (Razorpay callback, Razorpay webhook, Stripe
 * webhook). Safe to call any number of times with the same payment: only the first call changes anything.
 *
 * - booking still waiting (or its hold lapsed but the room is still free) -> CONFIRMED
 * - booking already confirmed -> nothing happens ("already_confirmed")
 * - booking cancelled, or its room has since been taken -> the guest's money is returned automatically
 *   instead of confirming a booking that would overbook the room or revive a cancellation.
 */
export async function confirmBookingPayment(bookingId: string, providerRef?: string): Promise<ConfirmOutcome> {
  const decision = await serializable(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId }, include: { payments: true } });
    if (!booking) throw new AuthError("Booking not found", 404);

    if (booking.status === "CONFIRMED" || booking.status === "COMPLETED") return { kind: "already" as const };

    const payment = booking.payments.find((p) => p.status === "PENDING" || p.status === "FAILED") ?? booking.payments[0];

    let canConfirm = booking.status === "PENDING" || booking.status === "EXPIRED";
    if (canConfirm && (booking.status === "EXPIRED" || booking.createdAt < holdCutoff())) {
      // The hold had lapsed: only confirm if the room is still free for these dates.
      try {
        await assertRoomAvailability(tx, booking.roomId, booking.checkIn, booking.checkOut, booking.unitsBooked, booking.id);
      } catch (error) {
        if (error instanceof AuthError) canConfirm = false;
        else throw error;
      }
    }

    // The money has been taken either way; record it before deciding what to do with the booking.
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "SUCCEEDED", paidAt: new Date(), ...(providerRef ? { providerRef } : {}) },
    });
    await tx.transaction.create({
      data: { paymentId: payment.id, type: "PAYMENT", amount: payment.amount, currency: payment.currency },
    });

    if (!canConfirm) return { kind: "refund" as const, paymentId: payment.id };

    await tx.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMED" } });
    if (booking.couponId) {
      // The hold may have expired and given the coupon back; taking it again keeps the usage count honest.
      const used = await tx.couponUsage.count({ where: { couponId: booking.couponId, userId: booking.userId } });
      if (used === 0) await tx.couponUsage.create({ data: { couponId: booking.couponId, userId: booking.userId } });
    }
    return { kind: "confirmed" as const };
  });

  if (decision.kind === "already") return "already_confirmed";
  if (decision.kind === "confirmed") return "confirmed";

  const refunded = await refundPayment(decision.paymentId, "Booking could not be confirmed");
  return refunded ? "refunded" : "refund_pending";
}

/**
 * Returns a captured payment to the guest through the payment provider, then records it. Returns false when
 * the provider refused or was unreachable: the payment then stays SUCCEEDED so the refund can be retried or
 * done by hand (it is logged), instead of the database claiming a refund that never happened.
 */
export async function refundPayment(paymentId: string, reason: string): Promise<boolean> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return false;
  if (payment.status === "REFUNDED") return true;
  if (payment.status !== "SUCCEEDED") return false;

  const amount = Number(payment.amount);
  try {
    // A payment with no provider reference was a local demo payment: there is no real money to return.
    if (payment.providerRef && amount > 0) {
      if (payment.provider === "RAZORPAY") await refundRazorpayPayment(payment.providerRef, amount, reason);
      else if (payment.provider === "STRIPE") await refundStripeCheckoutSession(payment.providerRef, amount);
    }
  } catch (error) {
    console.error(`Refund for payment ${paymentId} failed and must be retried or done manually:`, error);
    return false;
  }

  await prisma.$transaction(async (tx) => {
    const changed = await tx.payment.updateMany({
      where: { id: paymentId, status: "SUCCEEDED" },
      data: { status: "REFUNDED" },
    });
    if (changed.count === 1) {
      await tx.transaction.create({
        data: { paymentId, type: "REFUND", amount: payment.amount, currency: payment.currency, metadata: { reason } },
      });
    }
  });
  return true;
}

export async function verifyRazorpayPayment(
  bookingId: string,
  userId: string,
  params: { orderId: string; paymentId: string; signature: string },
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payments: true },
  });

  if (!booking || booking.userId !== userId) {
    throw new AuthError("Booking not found", 404);
  }

  // After the first confirmation the order id is replaced by the payment id, so match either (a repeated
  // verification of the same payment must be harmless, not an error).
  const payment = booking.payments.find((p) => p.providerRef === params.orderId || p.providerRef === params.paymentId);
  if (!payment) {
    throw new AuthError("Payment record not found for this order", 404);
  }

  const isValid = verifyRazorpaySignature(params);
  if (!isValid) {
    throw new AuthError("Payment verification failed", 400);
  }

  const outcome = await confirmBookingPayment(bookingId, params.paymentId);
  if (outcome === "refunded") {
    throw new AuthError(
      "Your payment arrived after this booking expired or was cancelled, so it was refunded automatically.",
      409,
    );
  }
  if (outcome === "refund_pending") {
    throw new AuthError(
      "Your payment arrived after this booking expired or was cancelled. We are refunding it; contact support if it doesn't arrive within a few days.",
      409,
    );
  }

  return prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { hotel: true, room: true },
  });
}

export async function getBookingByRef(bookingRef: string, userId: string) {
  const booking = await prisma.booking.findUnique({
    where: { bookingRef },
    include: {
      hotel: { include: { images: { take: 1, orderBy: { position: "asc" } } } },
      room: true,
      payments: true,
      guests: true,
    },
  });

  if (!booking || booking.userId !== userId) return null;
  return booking;
}

export async function listUserBookings(userId: string, scope: "upcoming" | "past" | "all") {
  await expireStaleBookings().catch(() => undefined);

  const now = new Date();
  const where: Prisma.BookingWhereInput = { userId };

  if (scope === "upcoming") {
    where.checkOut = { gte: now };
    where.status = { in: ["PENDING", "CONFIRMED"] };
  } else if (scope === "past") {
    where.OR = [{ checkOut: { lt: now } }, { status: { in: ["CANCELLED", "COMPLETED", "REFUNDED", "EXPIRED"] } }];
  }

  return prisma.booking.findMany({
    where,
    include: {
      hotel: { include: { images: { take: 1, orderBy: { position: "asc" } } } },
      room: true,
    },
    orderBy: { checkIn: scope === "past" ? "desc" : "asc" },
  });
}

export interface CancellationResult {
  booking: Awaited<ReturnType<typeof prisma.booking.update>>;
  refund: { status: "none" | "refunded" | "pending" | "not_eligible"; amount: number };
}

/**
 * Cancels a booking of the signed-in guest.
 * - unpaid (PENDING): simply released, nothing to refund;
 * - paid (CONFIRMED): refunded IN FULL through the payment provider when at least FREE_CANCELLATION_HOURS
 *   (default 48) remain before check-in; later cancellations are accepted but not refunded;
 * - a stay that has already started can't be cancelled online.
 * (Before this fix "cancel" only relabelled the payment as REFUNDED in the database - no money moved.)
 */
export async function cancelBooking(bookingId: string, userId: string, reason?: string): Promise<CancellationResult> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { payments: true } });
  if (!booking || booking.userId !== userId) {
    throw new AuthError("Booking not found", 404);
  }
  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    throw new AuthError("This booking can no longer be cancelled", 400);
  }

  const now = new Date();
  const hoursToCheckIn = (booking.checkIn.getTime() - now.getTime()) / 3_600_000;
  if (booking.status === "CONFIRMED" && startOfUtcDay(now) >= booking.checkIn) {
    throw new AuthError("Stays that have already started can't be cancelled online. Please contact the property.", 400);
  }
  const wasPaid = booking.status === "CONFIRMED";
  const refundEligible = wasPaid && hoursToCheckIn >= freeCancellationHours();

  const cancelled = await prisma.$transaction(async (tx) => {
    // The status check inside the UPDATE makes this safe against a double click or two tabs: exactly one
    // request cancels (and therefore refunds) the booking.
    const changed = await tx.booking.updateMany({
      where: { id: bookingId, status: { in: ["PENDING", "CONFIRMED"] } },
      data: {
        status: "CANCELLED",
        specialRequests: reason
          ? `${booking.specialRequests ?? ""}\n[Cancelled: ${reason}]`.trim()
          : booking.specialRequests,
      },
    });
    if (changed.count === 0) throw new AuthError("This booking can no longer be cancelled", 409);

    if (!wasPaid) {
      await tx.payment.updateMany({ where: { bookingId, status: "PENDING" }, data: { status: "FAILED" } });
      await releaseCoupon(tx, booking.couponId, booking.userId);
    }
    return tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
  });

  const paid = booking.payments.find((p) => p.status === "SUCCEEDED");
  if (!wasPaid || !paid) return { booking: cancelled, refund: { status: "none", amount: 0 } };
  if (!refundEligible) return { booking: cancelled, refund: { status: "not_eligible", amount: 0 } };

  const refunded = await refundPayment(paid.id, "Cancelled by guest");
  return {
    booking: cancelled,
    refund: { status: refunded ? "refunded" : "pending", amount: Number(paid.amount) },
  };
}

export async function listHotelBookings(hotelId: string) {
  return prisma.booking.findMany({
    where: { hotelId },
    include: { user: { select: publicUserSelect }, room: true },
    orderBy: { createdAt: "desc" },
  });
}
