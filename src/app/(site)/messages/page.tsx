"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, MessageSquare } from "lucide-react";
import { ConversationList } from "@/features/messages/components/conversation-list";
import { MessageThread } from "@/features/messages/components/message-thread";
import { useConversations } from "@/features/messages/hooks/use-conversations";

function MessagesContent() {
  const searchParams = useSearchParams();
  const { data: conversations, isLoading } = useConversations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cleared, setCleared] = useState(false);
  const activeId = cleared
    ? null
    : (selectedId ?? searchParams.get("c") ?? conversations?.[0]?.id ?? null);

  function selectConversation(id: string) {
    setCleared(false);
    setSelectedId(id);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight">Messages</h1>

      <div className="mt-6 grid h-150 grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-[320px_1fr]">
        <div className={`${activeId ? "hidden md:block" : "block"} overflow-y-auto md:border-r md:border-border`}>
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : (
            <ConversationList
              conversations={conversations ?? []}
              activeId={activeId}
              onSelect={selectConversation}
            />
          )}
        </div>

        <div className={activeId ? "flex flex-col" : "hidden md:flex md:flex-col"}>
          {activeId ? (
            <MessageThread conversationId={activeId} onBack={() => setCleared(true)} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <MessageSquare className="mb-2 size-8" />
              Select a conversation to start chatting.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesContent />
    </Suspense>
  );
}
