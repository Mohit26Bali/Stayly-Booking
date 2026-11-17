"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { ArrowLeft, Check, CheckCheck, Loader2, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/features/auth/store";
import {
  useConversationMessages,
  useSendMessage,
  useMarkConversationRead,
  usePingTyping,
  useTypingStatus,
} from "@/features/messages/hooks/use-conversations";

export function MessageThread({
  conversationId,
  onBack,
}: {
  conversationId: string;
  onBack?: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useConversationMessages(conversationId);
  const sendMessage = useSendMessage(conversationId);
  const markRead = useMarkConversationRead();
  const pingTyping = usePingTyping(conversationId);
  const { data: isOtherTyping } = useTypingStatus(conversationId);

  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastTypingPing = useRef(0);
  const markedRef = useRef<string | null>(null);

  useEffect(() => {
    if (data && markedRef.current !== conversationId) {
      markedRef.current = conversationId;
      markRead.mutate(conversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages.length]);

  function onDraftChange(value: string) {
    setDraft(value);
    const now = Date.now();
    if (now - lastTypingPing.current > 1500) {
      lastTypingPing.current = now;
      pingTyping.mutate();
    }
  }

  async function onSend() {
    if (!draft.trim()) return;
    const content = draft;
    setDraft("");
    await sendMessage.mutateAsync(content);
  }

  if (isLoading || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const otherIsOwner = user?.role === "CUSTOMER";
  const customerProfile = data.conversation.customer.profile;
  const customerName = customerProfile?.firstName
    ? `${customerProfile.firstName} ${customerProfile.lastName ?? ""}`.trim()
    : data.conversation.customer.email;
  const headerName = otherIsOwner ? data.conversation.hotel.name : customerName;
  const headerInitials = headerName.slice(0, 2).toUpperCase();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border p-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 text-muted-foreground hover:text-foreground md:hidden"
            aria-label="Back to conversations"
          >
            <ArrowLeft className="size-5" />
          </button>
        )}
        {otherIsOwner ? (
          <div className="relative size-9 shrink-0 overflow-hidden rounded-full bg-muted">
            {data.conversation.hotel.images[0] && (
              <Image src={data.conversation.hotel.images[0].url} alt={headerName} fill sizes="36px" className="object-cover" />
            )}
          </div>
        ) : (
          <Avatar className="shrink-0">
            <AvatarImage src={customerProfile?.avatarUrl ?? undefined} alt={headerName} />
            <AvatarFallback>{headerInitials}</AvatarFallback>
          </Avatar>
        )}
        <div>
          <p className="text-sm font-semibold">{headerName}</p>
          <p className="text-xs text-muted-foreground">{data.conversation.subject}</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {data.messages.map((message) => {
          const isMine = message.senderId === user?.id;
          return (
            <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  isMine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}
              >
                <p>{message.content}</p>
                <div
                  className={`mt-1 flex items-center gap-1 text-[10px] ${
                    isMine ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}
                >
                  {format(new Date(message.createdAt), "MMM d, h:mm a")}
                  {isMine && (message.readAt ? <CheckCheck className="size-3" /> : <Check className="size-3" />)}
                </div>
              </div>
            </div>
          );
        })}
        {isOtherTyping && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted px-4 py-2 text-sm text-muted-foreground">typing...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2 border-t border-border p-3">
        <Textarea
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="Write a message..."
          rows={1}
          className="min-h-10 resize-none"
        />
        <Button size="icon" onClick={onSend} disabled={sendMessage.isPending || !draft.trim()}>
          {sendMessage.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
