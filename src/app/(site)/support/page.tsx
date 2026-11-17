"use client";

import { useState } from "react";
import { Loader2, LifeBuoy } from "lucide-react";
import { TicketList } from "@/features/support/components/ticket-list";
import { TicketThread } from "@/features/support/components/ticket-thread";
import { NewTicketDialog } from "@/features/support/components/new-ticket-dialog";
import { useTickets } from "@/features/support/hooks/use-tickets";

export default function SupportPage() {
  const { data: tickets, isLoading } = useTickets();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = selectedId ?? tickets?.[0]?.id ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Support</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Get help with bookings, payments, or anything else.
          </p>
        </div>
        <NewTicketDialog />
      </div>

      <div className="mt-6 grid h-150 grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-[320px_1fr]">
        <div className={`${activeId ? "hidden md:block" : "block"} overflow-y-auto md:border-r md:border-border`}>
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : (
            <TicketList tickets={tickets ?? []} activeId={activeId} onSelect={setSelectedId} />
          )}
        </div>

        <div className={activeId ? "flex flex-col" : "hidden md:flex md:flex-col"}>
          {activeId ? (
            <TicketThread ticketId={activeId} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <LifeBuoy className="mb-2 size-8" />
              Select a ticket, or create a new one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
