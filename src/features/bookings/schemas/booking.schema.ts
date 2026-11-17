import { z } from "zod";

export const bookingGuestSchema = z.object({
  fullName: z.string().min(1).max(120),
  age: z.number().int().min(0).max(120).optional(),
});

export const createBookingSchema = z
  .object({
    roomId: z.string().min(1),
    checkIn: z.iso.date(),
    checkOut: z.iso.date(),
    guestsCount: z.number().int().min(1).max(20),
    unitsBooked: z.number().int().min(1).max(20).default(1),
    guests: z.array(bookingGuestSchema).default([]),
    specialRequests: z.string().max(1000).optional(),
    couponCode: z.string().optional(),
  })
  .refine((data) => new Date(data.checkOut) > new Date(data.checkIn), {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const cancelBookingSchema = z.object({
  reason: z.string().max(500).optional(),
});
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

export const verifyRazorpayPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});
export type VerifyRazorpayPaymentInput = z.infer<typeof verifyRazorpayPaymentSchema>;
