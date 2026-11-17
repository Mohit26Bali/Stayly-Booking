import { prisma } from "@/server/db/client";
import { AuthError } from "@/server/auth/service";

async function recomputeHotelRating(hotelId: string) {
  const agg = await prisma.review.aggregate({
    where: { hotelId },
    _avg: { rating: true },
    _count: true,
  });

  await prisma.hotel.update({
    where: { id: hotelId },
    data: {
      avgRating: agg._avg.rating ?? 0,
      reviewCount: agg._count,
    },
  });
}

export async function createReview(
  userId: string,
  input: { bookingId: string; rating: number; title?: string; comment: string },
) {
  const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } });

  if (!booking || booking.userId !== userId) {
    throw new AuthError("Booking not found", 404);
  }
  if (booking.status !== "CONFIRMED" && booking.status !== "COMPLETED") {
    throw new AuthError("Only confirmed stays can be reviewed", 400);
  }
  if (booking.checkOut > new Date()) {
    throw new AuthError("You can review this stay after your check-out date", 400);
  }

  const existing = await prisma.review.findUnique({ where: { bookingId: input.bookingId } });
  if (existing) {
    throw new AuthError("You've already reviewed this booking", 409);
  }

  let review;
  try {
    review = await prisma.review.create({
      data: {
        userId,
        hotelId: booking.hotelId,
        bookingId: booking.id,
        rating: input.rating,
        title: input.title,
        comment: input.comment,
      },
    });
  } catch (error) {
    // Double-click / two tabs: the unique constraint on bookingId decides, politely.
    if ((error as { code?: string }).code === "P2002") {
      throw new AuthError("You've already reviewed this booking", 409);
    }
    throw error;
  }

  await recomputeHotelRating(booking.hotelId);

  return review;
}

export async function replyToReview(reviewId: string, ownerId: string, reply: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId }, include: { hotel: true } });
  if (!review) throw new AuthError("Review not found", 404);
  if (review.hotel.ownerId !== ownerId) throw new AuthError("You don't manage this property", 403);

  return prisma.review.update({ where: { id: reviewId }, data: { ownerReply: reply } });
}

export async function toggleHelpfulVote(reviewId: string, userId: string) {
  const existing = await prisma.reviewHelpfulVote.findUnique({
    where: { reviewId_userId: { reviewId, userId } },
  });

  if (existing) {
    await prisma.reviewHelpfulVote.delete({ where: { id: existing.id } });
    return { helpful: false };
  }

  await prisma.reviewHelpfulVote.create({ data: { reviewId, userId } });
  return { helpful: true };
}

export async function getReviewableBookings(userId: string) {
  const bookings = await prisma.booking.findMany({
    where: {
      userId,
      status: { in: ["CONFIRMED", "COMPLETED"] },
      checkOut: { lte: new Date() },
      review: null,
    },
    include: { hotel: true, room: true },
    orderBy: { checkOut: "desc" },
  });

  return bookings;
}
