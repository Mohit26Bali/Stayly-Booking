import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";
import { useAuthStore } from "@/features/auth/store";
import type { Notification } from "@/types/notification";

export function useNotifications() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ notifications: Notification[] }>("/notifications");
      return data.notifications;
    },
    enabled: !!user,
  });
}

export function useUnreadNotificationCount() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ count: number }>("/notifications/unread-count");
      return data.count;
    },
    enabled: !!user,
    refetchInterval: 20000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.post("/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
