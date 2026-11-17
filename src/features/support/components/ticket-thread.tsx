"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/features/auth/store";
import { useTicketDetail, useAddTicketReply, useSetTicketStatus } from "@/features/support/hooks/use-tickets";
import { TicketPriorityBadge, TicketStatusBadge } from "@/features/support/components/ticket-status-badge";

export function TicketThread({ ticketId, isAdmin = false }: { ticketId: string; isAdmin?: boolean }) {
  const user = useAuthStore((s) => s.user);
  const { data: ticket, isLoading } = useTicketDetail(ticketId);
  const addReply = useAddTicketReply(ticketId);
  const setStatus = useSetTicketStatus();
  const [draft, setDraft] = useState("");

  async function onSend() {
    if (!draft.trim()) return;
    const content = draft;
    setDraft("");
    await addReply.mutateAsync(content);
  }

  if (isLoading || !ticket) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{ticket.subject}</p>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? ticket.user?.email : `Ticket #${ticket.id.slice(-6)}`} ·{" "}
              {format(new Date(ticket.createdAt), "MMM d, yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TicketPriorityBadge priority={ticket.priority} />
            {isAdmin ? (
              <Select
                value={ticket.status}
                onValueChange={(status) => {
                  if (!status) return;
                  setStatus.mutate(
                    { id: ticket.id, status },
                    { onSuccess: () => toast.success("Status updated") },
                  );
                }}
              >
                <SelectTrigger className="h-7 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <TicketStatusBadge status={ticket.status} />
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <div className="rounded-2xl bg-muted p-3 text-sm">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            {ticket.user?.email ?? "You"}
          </p>
          {ticket.description}
        </div>

        {ticket.replies?.map((reply) => {
          const isMine = reply.senderId === user?.id;
          return (
            <div key={reply.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  isMine ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                <p
                  className={`mb-1 text-xs font-medium ${isMine ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                >
                  {reply.sender.role === "ADMIN" ? "Support team" : reply.sender.email}
                </p>
                <p>{reply.content}</p>
                <p
                  className={`mt-1 text-[10px] ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                >
                  {format(new Date(reply.createdAt), "MMM d, h:mm a")}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {ticket.status !== "CLOSED" && (
        <div className="flex items-end gap-2 border-t border-border p-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Write a reply..."
            rows={1}
            className="min-h-10 resize-none"
          />
          <Button size="icon" onClick={onSend} disabled={addReply.isPending || !draft.trim()}>
            {addReply.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      )}
    </div>
  );
}
