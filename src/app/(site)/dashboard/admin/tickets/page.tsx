"use client";

import { useState } from "react";
import { Loader2, LifeBuoy } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketList } from "@/features/support/components/ticket-list";
import { TicketThread } from "@/features/support/components/ticket-thread";
import { useTickets } from "@/features/support/hooks/use-tickets";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

export default function AdminTicketsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: tickets, isLoading } = useTickets(statusFilter === "all" ? undefined : statusFilter);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = selectedId ?? tickets?.[0]?.id ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight">Support tickets</h1>

      <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setSelectedId(null); }} className="mt-4">
        <TabsList>
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-4 grid h-150 grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-[340px_1fr]">
        <div className={`${activeId ? "hidden md:block" : "block"} overflow-y-auto md:border-r md:border-border`}>
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : (
            <TicketList
              tickets={tickets ?? []}
              activeId={activeId}
              onSelect={setSelectedId}
              showRequester
            />
          )}
        </div>

        <div className={activeId ? "flex flex-col" : "hidden md:flex md:flex-col"}>
          {activeId ? (
            <TicketThread ticketId={activeId} isAdmin />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <LifeBuoy className="mb-2 size-8" />
              Select a ticket to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
