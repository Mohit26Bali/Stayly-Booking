import { Badge } from "@/components/ui/badge";
import type { TicketStatus, TicketPriority } from "@/types/ticket";

const STATUS_VARIANT: Record<TicketStatus, "default" | "secondary" | "destructive" | "outline"> = {
  OPEN: "destructive",
  IN_PROGRESS: "default",
  RESOLVED: "secondary",
  CLOSED: "outline",
};

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  LOW: "Low priority",
  MEDIUM: "Medium priority",
  HIGH: "High priority",
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status.replace("_", " ")}</Badge>;
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  const colors: Record<TicketPriority, string> = {
    LOW: "text-muted-foreground",
    MEDIUM: "text-accent",
    HIGH: "text-destructive",
  };
  return <span className={`text-xs font-medium ${colors[priority]}`}>{PRIORITY_LABEL[priority]}</span>;
}
