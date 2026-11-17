import { redis } from "@/server/db/redis";

const TYPING_TTL_SECONDS = 5;

// In-memory fallback when Redis is unreachable — fine for typing indicators,
// which are inherently ephemeral and don't need cross-instance consistency.
const memoryTyping = new Map<string, { userId: string; expiresAt: number }>();

export async function setTyping(conversationId: string, userId: string): Promise<void> {
  try {
    await redis.set(`typing:${conversationId}`, userId, "EX", TYPING_TTL_SECONDS);
  } catch {
    memoryTyping.set(conversationId, { userId, expiresAt: Date.now() + TYPING_TTL_SECONDS * 1000 });
  }
}

export async function getTypingUserId(conversationId: string): Promise<string | null> {
  try {
    return await redis.get(`typing:${conversationId}`);
  } catch {
    const entry = memoryTyping.get(conversationId);
    if (!entry || entry.expiresAt < Date.now()) return null;
    return entry.userId;
  }
}
