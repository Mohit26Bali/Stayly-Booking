"use client";

import { formatDistanceToNow } from "date-fns";
import { MessageCircle } from "lucide-react";
import { TicketStatusBadge } from "@/features/support/components/ticket-status-badge";
import type { SupportTicket } from "@/types/ticket";

export function TicketList({
  tickets,
  activeId,
  onSelect,
  showRequester = false,
}: {
  tickets: SupportTicket[];
  activeId: string | null;
  onSelect: (id: string) => void;
  showRequester?: boolean;
}) {
  if (tickets.length === 0) {
    return <div className="p-6 text-center text-sm text-muted-foreground">No tickets yet.</div>;
  }

  return (
    <div className="flex flex-col divide-y divide-border overflow-y-auto">
      {tickets.map((ticket) => (
        <button
          key={ticket.id}
          type="button"
          onClick={() => onSelect(ticket.id)}
          className={`flex flex-col items-start gap-1 p-4 text-left transition-colors hover:bg-muted ${
            activeId === ticket.id ? "bg-muted" : ""
          }`}
        >
          <div className="flex w-full items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold">{ticket.subject}</p>
            <TicketStatusBadge status={ticket.status} />
          </div>
          {showRequester && ticket.user && (
            <p className="text-xs text-muted-foreground">{ticket.user.email}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}</span>
            {!!ticket._count?.replies && (
              <span className="flex items-center gap-1">
                <MessageCircle className="size-3" />
                {ticket._count.replies}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
