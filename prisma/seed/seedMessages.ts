import { prisma, faker, addHours, log } from "./lib";
import type { Hotel, Message, User } from "../../src/generated/prisma/client";

const TOPICS = [
  "Early Check-in",
  "Airport Pickup",
  "Breakfast",
  "Parking",
  "Room Upgrade",
  "Cancellation",
  "Refund",
] as const;

const OPENERS: Record<(typeof TOPICS)[number], string> = {
  "Early Check-in": "Hi! Is it possible to check in a few hours early on arrival day?",
  "Airport Pickup": "Do you offer airport pickup? I'd like to arrange one if possible.",
  Breakfast: "What time does breakfast start, and is it included in our rate?",
  Parking: "Is there on-site parking available for guests with a car?",
  "Room Upgrade": "Is a room upgrade available for our stay? Happy to pay the difference.",
  Cancellation: "I may need to cancel my upcoming booking — what's the policy?",
  Refund: "Following up on my refund request — any update on the timeline?",
};

const OWNER_REPLIES: Record<(typeof TOPICS)[number], string[]> = {
  "Early Check-in": ["We'll do our best to have the room ready early — I'll confirm the morning of your arrival.", "Early check-in looks fine based on current occupancy. See you then!"],
  "Airport Pickup": ["Yes, we can arrange a pickup for a small fee. Could you share your flight details?", "We've booked a driver for you — they'll be at arrivals with a sign."],
  Breakfast: ["Breakfast runs from 7 to 10:30am and is included in your rate.", "It's included, served in the main restaurant on the ground floor."],
  Parking: ["Yes, we have free on-site parking for all guests.", "Parking is available, though spaces are limited on weekends — first come, first served."],
  "Room Upgrade": ["We have a suite available for your dates — I'll send over the difference in cost.", "Let me check availability and get back to you within the hour."],
  Cancellation: ["No problem — cancellations more than 48 hours out are fully refundable.", "I've noted your request. You're within the free cancellation window."],
  Refund: ["Your refund has been processed and should reflect in 3-5 business days.", "Apologies for the delay — I've escalated this and it should be resolved shortly."],
};

const FOLLOWUPS = [
  "Thank you, that's really helpful!",
  "Perfect, appreciate the quick response.",
  "Great, looking forward to it.",
  "Thanks for confirming!",
  "That works for us, thank you.",
];

export interface SeedMessagesResult {
  conversationCount: number;
  messages: Message[];
}

export async function seedMessages(
  customers: User[],
  hotels: Hotel[],
  conversationCount: number,
  targetMessageCount: number,
): Promise<SeedMessagesResult> {
  log(`Seeding ${conversationCount} conversations (~${targetMessageCount} messages)`);

  const pairs = new Set<string>();
  const messages: Message[] = [];
  const avgMessagesPerConvo = Math.max(3, Math.round(targetMessageCount / conversationCount));

  let attempts = 0;
  let created = 0;

  while (created < conversationCount && attempts < conversationCount * 10) {
    attempts += 1;
    const customer = faker.helpers.arrayElement(customers);
    const hotel = faker.helpers.arrayElement(hotels);
    const key = `${hotel.id}:${customer.id}`;
    if (pairs.has(key)) continue;
    pairs.add(key);

    const topic = faker.helpers.arrayElement(TOPICS);
    let cursor = faker.date.recent({ days: 45 });

    const conversation = await prisma.conversation.create({
      data: {
        hotelId: hotel.id,
        customerId: customer.id,
        subject: topic,
        createdAt: cursor,
      },
    });

    const messageCount = faker.number.int({ min: Math.max(3, avgMessagesPerConvo - 2), max: avgMessagesPerConvo + 3 });
    const thread: string[] = [
      OPENERS[topic],
      faker.helpers.arrayElement(OWNER_REPLIES[topic]),
      faker.helpers.arrayElement(FOLLOWUPS),
    ];
    while (thread.length < messageCount) {
      thread.push(
        thread.length % 2 === 0 ? faker.helpers.arrayElement(OWNER_REPLIES[topic]) : faker.helpers.arrayElement(FOLLOWUPS),
      );
    }

    for (let i = 0; i < thread.length; i++) {
      cursor = addHours(cursor, faker.number.float({ min: 0.2, max: 6 }));
      const isCustomerTurn = i % 2 === 0;
      const isRecent = i >= thread.length - 2;

      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: isCustomerTurn ? customer.id : hotel.ownerId,
          content: thread[i],
          readAt: isRecent && faker.datatype.boolean({ probability: 0.3 }) ? null : cursor,
          createdAt: cursor,
        },
      });
      messages.push(message);
    }

    created += 1;
  }

  return { conversationCount: created, messages };
}
