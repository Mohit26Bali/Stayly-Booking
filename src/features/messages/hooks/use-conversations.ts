import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";
import { useAuthStore } from "@/features/auth/store";
import type { Conversation, Message } from "@/types/message";
import type { StartConversationInput } from "@/features/messages/schemas/message.schema";

export function useConversations() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ conversations: Conversation[] }>("/conversations");
      return data.conversations;
    },
    enabled: !!user,
    refetchInterval: 15000,
  });
}

export function useConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ["conversations", conversationId, "messages"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ conversation: Conversation; messages: Message[] }>(
        `/conversations/${conversationId}/messages`,
      );
      return data;
    },
    enabled: !!conversationId,
    refetchInterval: conversationId ? 4000 : false,
  });
}

export function useStartConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: StartConversationInput) => {
      const { data } = await apiClient.post<{ conversation: Conversation; message: Message }>(
        "/conversations",
        input,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      const { data } = await apiClient.post<{ message: Message }>(
        `/conversations/${conversationId}/messages`,
        { content },
      );
      return data.message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations", conversationId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      await apiClient.post(`/conversations/${conversationId}/read`);
    },
    onSuccess: (_data, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ["conversations", conversationId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversations", "unread-count"] });
    },
  });
}

export function useUnreadMessageCount() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["conversations", "unread-count"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ count: number }>("/conversations/unread-count");
      return data.count;
    },
    enabled: !!user,
    refetchInterval: 15000,
  });
}

export function usePingTyping(conversationId: string | null) {
  return useMutation({
    mutationFn: async () => {
      if (!conversationId) return;
      await apiClient.post(`/conversations/${conversationId}/typing`);
    },
  });
}

export function useTypingStatus(conversationId: string | null) {
  return useQuery({
    queryKey: ["conversations", conversationId, "typing"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ isOtherTyping: boolean }>(
        `/conversations/${conversationId}/typing`,
      );
      return data.isOtherTyping;
    },
    enabled: !!conversationId,
    refetchInterval: conversationId ? 2000 : false,
  });
}
