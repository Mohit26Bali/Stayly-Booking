import { prisma, faker, log } from "./lib";
import type { Booking, Review } from "../../src/generated/prisma/client";

const REVIEW_TITLES = [
  "Wonderful stay",
  "Exceeded expectations",
  "Great value for money",
  "Would definitely come back",
  "Comfortable and convenient",
  "Lovely property",
  "Solid choice for the price",
  "Friendly staff, clean rooms",
  "A relaxing few days",
  "Better than expected",
];

const REVIEW_COMMENTS = [
  "The room was spotless and the staff went out of their way to help with everything we needed.",
  "Loved the location — walking distance to everything, and check-in was smooth.",
  "Bed was comfortable, water pressure was great, and breakfast had good variety.",
  "A bit noisy at night but otherwise a pleasant stay with attentive staff.",
  "Exactly as pictured. Would recommend to anyone visiting the area.",
  "The room could use a small refresh, but the service more than made up for it.",
  "Perfect for a short trip — quick check-in, quiet room, good WiFi throughout.",
  "Staff remembered our names by day two, which was a nice touch.",
  "Great amenities for the price point. The pool area was a highlight.",
  "Check-out was quick and the front desk helped us book a cab with no fuss.",
];

const OWNER_REPLIES = [
  "Thank you so much for staying with us — we're glad you enjoyed it and hope to host you again!",
  "We really appreciate you taking the time to share this. Looking forward to your next visit.",
  "Thanks for the kind words — we've passed this along to the team, they'll be thrilled to hear it.",
  "We're sorry about the noise and will be looking into it. Thank you for your patience and feedback.",
  "So glad the location worked well for you! Hope to welcome you back soon.",
];

export async function seedReviews(reviewEligible: Booking[], targetCount: number): Promise<Review[]> {
  const pool = faker.helpers.shuffle([...reviewEligible]).slice(0, targetCount);
  log(`Seeding ${pool.length} reviews`);

  const reviews: Review[] = [];
  const hotelIdsTouched = new Set<string>();

  for (const booking of pool) {
    const withReply = faker.datatype.boolean({ probability: 0.25 });

    const review = await prisma.review.create({
      data: {
        userId: booking.userId,
        hotelId: booking.hotelId,
        bookingId: booking.id,
        rating: faker.number.int({ min: 3, max: 5 }),
        title: faker.helpers.arrayElement(REVIEW_TITLES),
        comment: faker.helpers.arrayElement(REVIEW_COMMENTS),
        ownerReply: withReply ? faker.helpers.arrayElement(OWNER_REPLIES) : null,
      },
    });

    reviews.push(review);
    hotelIdsTouched.add(booking.hotelId);
  }

  log(`Recomputing ratings for ${hotelIdsTouched.size} hotels`);
  for (const hotelId of hotelIdsTouched) {
    const agg = await prisma.review.aggregate({
      where: { hotelId },
      _avg: { rating: true },
      _count: true,
    });
    await prisma.hotel.update({
      where: { id: hotelId },
      data: { avgRating: agg._avg.rating ?? 0, reviewCount: agg._count },
    });
  }

  return reviews;
}
