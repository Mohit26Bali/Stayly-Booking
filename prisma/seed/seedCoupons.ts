import { prisma, addDays, log } from "./lib";
import type { Coupon } from "../../src/generated/prisma/client";

interface CouponSpec {
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  minBookingAmount?: number;
  maxDiscountAmount?: number;
  maxUses?: number;
  maxUsesPerUser?: number;
  expiresInDays?: number;
  isActive?: boolean;
}

const COUPONS: CouponSpec[] = [
  { code: "WELCOME10", type: "PERCENTAGE", value: 10, maxDiscountAmount: 500, maxUsesPerUser: 1 },
  { code: "SUMMER15", type: "PERCENTAGE", value: 15, minBookingAmount: 5000, maxDiscountAmount: 1200, expiresInDays: 60 },
  { code: "FESTIVE20", type: "PERCENTAGE", value: 20, minBookingAmount: 8000, maxDiscountAmount: 2500, expiresInDays: 90 },
  { code: "WEEKEND10", type: "PERCENTAGE", value: 10, maxDiscountAmount: 600 },
  { code: "NEWUSER", type: "FIXED", value: 500, maxUsesPerUser: 1 },
  { code: "SAVE500", type: "FIXED", value: 500, minBookingAmount: 3000 },
  { code: "GOA20", type: "PERCENTAGE", value: 20, minBookingAmount: 5000, maxDiscountAmount: 2000, expiresInDays: 45 },
  { code: "JAIPUR15", type: "PERCENTAGE", value: 15, minBookingAmount: 4000, maxDiscountAmount: 1500, expiresInDays: 45 },
];

export async function seedCoupons(): Promise<Coupon[]> {
  log(`Seeding ${COUPONS.length} coupons`);
  const now = new Date();

  const coupons = await Promise.all(
    COUPONS.map((c) =>
      prisma.coupon.upsert({
        where: { code: c.code },
        update: {},
        create: {
          code: c.code,
          type: c.type,
          value: c.value,
          minBookingAmount: c.minBookingAmount,
          maxDiscountAmount: c.maxDiscountAmount,
          maxUses: c.maxUses,
          maxUsesPerUser: c.maxUsesPerUser ?? 3,
          expiresAt: c.expiresInDays ? addDays(now, c.expiresInDays) : undefined,
          isActive: c.isActive ?? true,
        },
      }),
    ),
  );

  return coupons;
}
