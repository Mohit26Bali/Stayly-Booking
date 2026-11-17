export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH";

export interface TicketUser {
  id: string;
  email: string;
  role: string;
  profile: { firstName: string | null; lastName: string | null; avatarUrl: string | null } | null;
}

export interface TicketReply {
  id: string;
  ticketId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: TicketUser;
}

export interface SupportTicket {
  id: string;
  userId: string;
  assigneeId: string | null;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  user?: TicketUser;
  assignee?: TicketUser | null;
  replies?: TicketReply[];
  _count?: { replies: number };
}
