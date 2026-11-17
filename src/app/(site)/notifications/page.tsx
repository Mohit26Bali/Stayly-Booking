"use client";

import { formatDistanceToNow } from "date-fns";
import { Bell, CalendarCheck, Gift, Info, Loader2, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/features/notifications/hooks/use-notifications";
import type { Notification, NotificationType } from "@/types/notification";

const ICON_BY_TYPE: Record<NotificationType, typeof Bell> = {
  BOOKING_UPDATE: CalendarCheck,
  PRICE_DROP: TrendingDown,
  PROMOTION: Gift,
  MESSAGE: Bell,
  SYSTEM: Info,
};

function NotificationRow({ notification }: { notification: Notification }) {
  const markRead = useMarkNotificationRead();
  const Icon = ICON_BY_TYPE[notification.type];
  const isUnread = !notification.readAt;

  return (
    <button
      type="button"
      onClick={() => isUnread && markRead.mutate(notification.id)}
      className={`flex w-full items-start gap-4 rounded-2xl border border-border p-4 text-left transition-colors hover:bg-muted ${
        isUnread ? "bg-primary/5" : "bg-card"
      }`}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{notification.title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{notification.body}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>
      {isUnread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
    </button>
  );
}

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();
  const unreadCount = notifications?.filter((n) => !n.readAt).length ?? 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}>
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : !notifications || notifications.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Nothing here yet.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {notifications.map((n) => (
            <NotificationRow key={n.id} notification={n} />
          ))}
        </div>
      )}
    </div>
  );
}
