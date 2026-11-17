"use client";

import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/features/auth/store";
import type { Conversation } from "@/types/message";

function displayName(conversation: Conversation, isOwnerView: boolean): string {
  if (isOwnerView) {
    const p = conversation.customer.profile;
    return p?.firstName ? `${p.firstName} ${p.lastName ?? ""}`.trim() : conversation.customer.email;
  }
  return conversation.hotel.name;
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const user = useAuthStore((s) => s.user);
  const isOwnerView = user?.role === "HOTEL_OWNER" || user?.role === "ADMIN";

  if (conversations.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        No conversations yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border overflow-y-auto">
      {conversations.map((c) => {
        const lastMessage = c.messages[0];
        const hotelImage = c.hotel.images[0];
        const customerAvatar = c.customer.profile?.avatarUrl;
        const name = displayName(c, isOwnerView);
        const initials = name.slice(0, 2).toUpperCase();

        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className={`flex items-start gap-3 p-4 text-left transition-colors hover:bg-muted ${
              activeId === c.id ? "bg-muted" : ""
            }`}
          >
            {isOwnerView ? (
              <Avatar size="lg" className="shrink-0">
                <AvatarImage src={customerAvatar ?? undefined} alt={name} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            ) : (
              <div className="relative size-11 shrink-0 overflow-hidden rounded-full bg-muted">
                {hotelImage && (
                  <Image src={hotelImage.url} alt={c.hotel.name} fill sizes="44px" className="object-cover" />
                )}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold">{name}</p>
                {lastMessage && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: false })}
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">{c.subject}</p>
              {lastMessage && (
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{lastMessage.content}</p>
              )}
            </div>
            {c.unreadCount > 0 && (
              <Badge className="shrink-0" variant="default">
                {c.unreadCount}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
