"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Bell, CalendarCheck, Gift, Info, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/features/auth/store";
import {
  useNotifications,
  useUnreadNotificationCount,
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
      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted ${
        isUnread ? "bg-primary/5" : ""
      }`}
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{notification.title}</p>
        <p className="truncate text-xs text-muted-foreground">{notification.body}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>
      {isUnread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
    </button>
  );
}

export function NotificationBell() {
  const user = useAuthStore((s) => s.user);
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data: notifications = [] } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();

  if (!user) return null;

  const recent = notifications.slice(0, 6);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Notifications" className="relative" />
        }
      >
        <Bell className="size-[1.1rem]" />
        {unreadCount > 0 && (
          <Badge className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full p-0 text-[10px]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              className="text-xs font-medium text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>

        {recent.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            You&apos;re all caught up.
          </p>
        ) : (
          <div className="max-h-96 divide-y divide-border overflow-y-auto">
            {recent.map((n) => (
              <NotificationRow key={n.id} notification={n} />
            ))}
          </div>
        )}

        <Link
          href="/notifications"
          className="block border-t border-border px-4 py-2.5 text-center text-sm font-medium text-primary hover:bg-muted"
        >
          View all
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
