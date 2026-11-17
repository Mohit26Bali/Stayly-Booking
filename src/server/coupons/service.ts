import { prisma } from "@/server/db/client";
import { AuthError } from "@/server/auth/service";
import type { Prisma } from "@/generated/prisma/client";

export interface CouponPreview {
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  discountAmount: number;
}

type Db = typeof prisma | Prisma.TransactionClient;

export async function validateCoupon(
  code: string,
  userId: string,
  bookingAmount: number,
  db: Db = prisma,
): Promise<CouponPreview & { couponId: string }> {
  const coupon = await db.coupon.findUnique({ where: { code: code.toUpperCase() } });

  if (!coupon || !coupon.isActive) {
    throw new AuthError("This coupon code is invalid", 404);
  }
  if (coupon.startsAt && coupon.startsAt > new Date()) {
    throw new AuthError("This coupon isn't active yet", 400);
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new AuthError("This coupon has expired", 400);
  }
  if (coupon.minBookingAmount && bookingAmount < Number(coupon.minBookingAmount)) {
    throw new AuthError(
      `This coupon requires a minimum booking of ₹${coupon.minBookingAmount}`,
      400,
    );
  }

  if (coupon.maxUses) {
    const totalUses = await db.couponUsage.count({ where: { couponId: coupon.id } });
    if (totalUses >= coupon.maxUses) {
      throw new AuthError("This coupon has reached its usage limit", 400);
    }
  }

  const userUses = await db.couponUsage.count({
    where: { couponId: coupon.id, userId },
  });
  if (userUses >= coupon.maxUsesPerUser) {
    throw new AuthError("You've already used this coupon", 400);
  }

  let discountAmount =
    coupon.type === "PERCENTAGE"
      ? Math.round(bookingAmount * (Math.min(Number(coupon.value), 100) / 100) * 100) / 100
      : Number(coupon.value);
  // maxDiscountAmount caps big percentage discounts; a discount can never exceed what is being paid.
  if (coupon.maxDiscountAmount) discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
  discountAmount = Math.max(0, Math.min(discountAmount, bookingAmount));

  return {
    code: coupon.code,
    type: coupon.type,
    value: Number(coupon.value),
    discountAmount,
    couponId: coupon.id,
  };
}
