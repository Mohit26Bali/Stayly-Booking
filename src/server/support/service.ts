import { prisma } from "@/server/db/client";
import { AuthError } from "@/server/auth/service";
import { publicUserSelect } from "@/server/db/selects";
import type { Prisma } from "@/generated/prisma/client";

const ticketDetailInclude = {
  user: { select: publicUserSelect },
  assignee: { select: publicUserSelect },
  replies: {
    include: { sender: { select: publicUserSelect } },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.SupportTicketInclude;

async function assertAccess(ticketId: string, userId: string, isAdmin: boolean) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new AuthError("Ticket not found", 404);
  if (!isAdmin && ticket.userId !== userId) {
    throw new AuthError("You don't have access to this ticket", 403);
  }
  return ticket;
}

export async function createTicket(
  userId: string,
  input: { subject: string; description: string; priority?: "LOW" | "MEDIUM" | "HIGH" },
) {
  return prisma.supportTicket.create({
    data: {
      userId,
      subject: input.subject,
      description: input.description,
      priority: input.priority ?? "MEDIUM",
    },
  });
}

export async function listMyTickets(userId: string) {
  return prisma.supportTicket.findMany({
    where: { userId },
    include: { assignee: { select: publicUserSelect }, _count: { select: { replies: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function listAllTickets(status?: string) {
  const where: Prisma.SupportTicketWhereInput = status
    ? { status: status as Prisma.SupportTicketWhereInput["status"] }
    : {};

  return prisma.supportTicket.findMany({
    where,
    include: {
      user: { select: publicUserSelect },
      assignee: { select: publicUserSelect },
      _count: { select: { replies: true } },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });
}

export async function getTicketDetail(ticketId: string, userId: string, isAdmin: boolean) {
  await assertAccess(ticketId, userId, isAdmin);

  return prisma.supportTicket.findUniqueOrThrow({
    where: { id: ticketId },
    include: ticketDetailInclude,
  });
}

export async function addTicketReply(
  ticketId: string,
  senderId: string,
  content: string,
  isAdmin: boolean,
) {
  const ticket = await assertAccess(ticketId, senderId, isAdmin);
  if (ticket.status === "CLOSED") {
    throw new AuthError("This ticket is closed", 400);
  }

  const reply = await prisma.ticketReply.create({
    data: { ticketId, senderId, content },
    include: { sender: { select: publicUserSelect } },
  });

  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      updatedAt: new Date(),
      status: isAdmin && ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status,
    },
  });

  return reply;
}

export async function setTicketStatus(
  ticketId: string,
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED",
) {
  return prisma.supportTicket.update({ where: { id: ticketId }, data: { status } });
}

export async function assignTicket(ticketId: string, assigneeId: string | null) {
  return prisma.supportTicket.update({ where: { id: ticketId }, data: { assigneeId } });
}
