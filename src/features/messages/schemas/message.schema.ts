import { z } from "zod";

export const startConversationSchema = z.object({
  hotelId: z.string().min(1),
  subject: z.string().min(1).max(120),
  message: z.string().min(1).max(2000),
});
export type StartConversationInput = z.infer<typeof startConversationSchema>;

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
