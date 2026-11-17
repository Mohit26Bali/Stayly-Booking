export type NotificationType = "BOOKING_UPDATE" | "PRICE_DROP" | "PROMOTION" | "MESSAGE" | "SYSTEM";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  readAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
