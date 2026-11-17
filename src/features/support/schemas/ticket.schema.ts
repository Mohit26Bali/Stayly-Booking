import { z } from "zod";

export const createTicketSchema = z.object({
  subject: z.string().min(3).max(120),
  description: z.string().min(10).max(2000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const addReplySchema = z.object({
  content: z.string().min(1).max(2000),
});
export type AddReplyInput = z.infer<typeof addReplySchema>;

export const setTicketStatusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
});

export const assignTicketSchema = z.object({
  assigneeId: z.string().nullable(),
});
