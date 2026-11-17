import { prisma, faker, addDays, nextInvoiceNumber, log } from "./lib";
import type { Booking, Payment } from "../../src/generated/prisma/client";

const PROVIDERS = ["STRIPE", "RAZORPAY", "UPI", "CREDIT_CARD"] as const;

export async function seedPayments(bookings: Booking[], tierTag: string): Promise<Payment[]> {
  const completed = bookings.filter((b) => b.status === "COMPLETED");
  const confirmed = bookings.filter((b) => b.status === "CONFIRMED");
  const refunded = bookings.filter((b) => b.status === "REFUNDED");
  const pending = faker.helpers.arrayElements(
    bookings.filter((b) => b.status === "PENDING"),
    10,
  );

  const targets = [...completed, ...confirmed, ...refunded, ...pending];
  log(`Seeding ${targets.length} payments`);

  const payments: Payment[] = [];

  for (const booking of targets) {
    const isPaid = booking.status !== "PENDING";
    const paidAt = isPaid ? addDays(booking.createdAt, faker.number.int({ min: 0, max: 1 })) : null;

    const payment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        provider: faker.helpers.arrayElement(PROVIDERS),
        providerRef: isPaid ? faker.string.alphanumeric({ length: 18, casing: "mixed" }) : null,
        invoiceNumber: isPaid ? nextInvoiceNumber(tierTag) : null,
        amount: booking.totalAmount,
        taxAmount: booking.taxAmount,
        discountAmount: booking.discountAmount,
        currency: booking.currency,
        status: booking.status === "REFUNDED" ? "REFUNDED" : isPaid ? "SUCCEEDED" : "PENDING",
        paidAt,
      },
    });

    payments.push(payment);
  }

  return payments;
}
