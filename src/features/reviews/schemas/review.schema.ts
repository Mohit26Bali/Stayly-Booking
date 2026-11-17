import { z } from "zod";

export const createReviewSchema = z.object({
  bookingId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  comment: z.string().min(10, "Please write at least 10 characters").max(2000),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const replyReviewSchema = z.object({
  reply: z.string().min(1).max(1000),
});
export type ReplyReviewInput = z.infer<typeof replyReviewSchema>;
