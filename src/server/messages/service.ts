import { prisma } from "@/server/db/client";
import { AuthError } from "@/server/auth/service";
import { publicUserSelect } from "@/server/db/selects";
import type { Prisma } from "@/generated/prisma/client";

const conversationListInclude = {
  hotel: { select: { id: true, name: true, slug: true, ownerId: true, images: { take: 1, orderBy: { position: "asc" as const } } } },
  customer: { select: publicUserSelect },
  messages: { orderBy: { createdAt: "desc" as const }, take: 1 },
} satisfies Prisma.ConversationInclude;

async function assertParticipant(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { hotel: { select: { ownerId: true } } },
  });

  if (!conversation) throw new AuthError("Conversation not found", 404);
  if (conversation.customerId !== userId && conversation.hotel.ownerId !== userId) {
    throw new AuthError("You don't have access to this conversation", 403);
  }

  return conversation;
}

export async function startConversation(
  customerId: string,
  hotelId: string,
  subject: string,
  firstMessage: string,
) {
  const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
  if (!hotel) throw new AuthError("Hotel not found", 404);
  if (hotel.ownerId === customerId) {
    throw new AuthError("You can't message your own property", 400);
  }

  const conversation = await prisma.conversation.upsert({
    where: { hotelId_customerId: { hotelId, customerId } },
    update: { updatedAt: new Date() },
    create: { hotelId, customerId, subject },
  });

  const message = await prisma.message.create({
    data: { conversationId: conversation.id, senderId: customerId, content: firstMessage },
  });

  return { conversation, message };
}

export async function listConversationsForUser(userId: string, role: string) {
  const where: Prisma.ConversationWhereInput =
    role === "HOTEL_OWNER" || role === "ADMIN"
      ? { hotel: { ownerId: userId } }
      : { customerId: userId };

  const conversations = await prisma.conversation.findMany({
    where,
    include: conversationListInclude,
    orderBy: { updatedAt: "desc" },
  });

  const unreadCounts = await prisma.message.groupBy({
    by: ["conversationId"],
    where: {
      conversationId: { in: conversations.map((c) => c.id) },
      senderId: { not: userId },
      readAt: null,
    },
    _count: true,
  });
  const unreadByConversation = new Map(unreadCounts.map((u) => [u.conversationId, u._count]));

  return conversations.map((c) => ({
    ...c,
    unreadCount: unreadByConversation.get(c.id) ?? 0,
  }));
}

export async function getConversationMessages(conversationId: string, userId: string) {
  await assertParticipant(conversationId, userId);

  const [conversation, messages] = await Promise.all([
    prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      include: conversationListInclude,
    }),
    prisma.message.findMany({
      where: { conversationId },
      include: { sender: { select: publicUserSelect } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return { conversation, messages };
}

export async function sendMessage(conversationId: string, senderId: string, content: string) {
  await assertParticipant(conversationId, senderId);

  const message = await prisma.message.create({
    data: { conversationId, senderId, content },
    include: { sender: { select: publicUserSelect } },
  });

  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

  return message;
}

export async function markConversationRead(conversationId: string, userId: string) {
  await assertParticipant(conversationId, userId);

  await prisma.message.updateMany({
    where: { conversationId, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function unreadMessageCount(userId: string, role: string): Promise<number> {
  const where: Prisma.MessageWhereInput =
    role === "HOTEL_OWNER" || role === "ADMIN"
      ? { conversation: { hotel: { ownerId: userId } }, senderId: { not: userId }, readAt: null }
      : { conversation: { customerId: userId }, senderId: { not: userId }, readAt: null };

  return prisma.message.count({ where });
}
