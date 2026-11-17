import { prisma, faker, addDays, log } from "./lib";
import type { Booking, Notification, User } from "../../src/generated/prisma/client";

interface NotificationTemplate {
  type: "BOOKING_UPDATE" | "PRICE_DROP" | "PROMOTION" | "SYSTEM";
  title: string;
  body: (context: { hotelName?: string }) => string;
}

const BOOKING_TEMPLATES: NotificationTemplate[] = [
  {
    type: "BOOKING_UPDATE",
    title: "Booking Confirmed",
    body: ({ hotelName }) => `Your booking at ${hotelName} is confirmed. We've sent the details to your email.`,
  },
  {
    type: "BOOKING_UPDATE",
    title: "Booking Cancelled",
    body: ({ hotelName }) => `Your booking at ${hotelName} has been cancelled as requested.`,
  },
  {
    type: "BOOKING_UPDATE",
    title: "Payment Successful",
    body: ({ hotelName }) => `We've received your payment for your stay at ${hotelName}.`,
  },
  {
    type: "BOOKING_UPDATE",
    title: "Upcoming Stay",
    body: ({ hotelName }) => `Your stay at ${hotelName} is coming up soon — safe travels!`,
  },
  {
    type: "BOOKING_UPDATE",
    title: "Review Reminder",
    body: ({ hotelName }) => `How was your stay at ${hotelName}? Leave a review to help other travelers.`,
  },
];

const PROMO_TEMPLATES: NotificationTemplate[] = [
  {
    type: "PROMOTION",
    title: "Weekend deal just for you",
    body: () => "Save up to 20% on select stays this weekend. Book before the offer ends.",
  },
  {
    type: "PRICE_DROP",
    title: "Price drop on a saved hotel",
    body: () => "A hotel in your wishlist just dropped in price. Take a look before it's gone.",
  },
];

export async function seedNotifications(
  customers: User[],
  bookings: Booking[],
  hotelNameById: Map<string, string>,
  targetCount: number,
): Promise<Notification[]> {
  log(`Seeding ${targetCount} notifications`);
  const notifications: Notification[] = [];

  // Every customer gets a welcome notification.
  for (const customer of customers) {
    const notification = await prisma.notification.create({
      data: {
        userId: customer.id,
        type: "SYSTEM",
        title: "Welcome Message",
        body: "Welcome to Stayly! Start exploring stays and save your favorites to your wishlist.",
        readAt: faker.datatype.boolean({ probability: 0.6 }) ? faker.date.recent({ days: 20 }) : null,
        createdAt: faker.date.recent({ days: 60 }),
      },
    });
    notifications.push(notification);
  }

  const remaining = Math.max(0, targetCount - notifications.length);
  const bookingSample = faker.helpers.arrayElements(bookings, Math.min(remaining, bookings.length));

  for (const booking of bookingSample) {
    const template = faker.helpers.arrayElement(BOOKING_TEMPLATES);
    const hotelName = hotelNameById.get(booking.hotelId) ?? "your hotel";
    const createdAt = addDays(booking.createdAt, faker.number.int({ min: 0, max: 2 }));

    const notification = await prisma.notification.create({
      data: {
        userId: booking.userId,
        type: template.type,
        title: template.title,
        body: template.body({ hotelName }),
        readAt: faker.datatype.boolean({ probability: 0.5 }) ? addDays(createdAt, 1) : null,
        createdAt,
        metadata: { bookingId: booking.id },
      },
    });
    notifications.push(notification);
  }

  const promoSlots = Math.max(0, targetCount - notifications.length);
  for (let i = 0; i < promoSlots; i++) {
    const customer = faker.helpers.arrayElement(customers);
    const template = faker.helpers.arrayElement(PROMO_TEMPLATES);

    const notification = await prisma.notification.create({
      data: {
        userId: customer.id,
        type: template.type,
        title: template.title,
        body: template.body({}),
        readAt: faker.datatype.boolean({ probability: 0.4 }) ? faker.date.recent({ days: 10 }) : null,
        createdAt: faker.date.recent({ days: 30 }),
      },
    });
    notifications.push(notification);
  }

  return notifications;
}
