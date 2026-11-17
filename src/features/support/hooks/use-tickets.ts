import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";
import type { SupportTicket } from "@/types/ticket";
import type { CreateTicketInput } from "@/features/support/schemas/ticket.schema";

export function useTickets(status?: string) {
  return useQuery({
    queryKey: ["support-tickets", status ?? "all"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ tickets: SupportTicket[] }>(
        `/support-tickets${status ? `?status=${status}` : ""}`,
      );
      return data.tickets;
    },
  });
}

export function useTicketDetail(ticketId: string | null) {
  return useQuery({
    queryKey: ["support-tickets", ticketId],
    queryFn: async () => {
      const { data } = await apiClient.get<{ ticket: SupportTicket }>(`/support-tickets/${ticketId}`);
      return data.ticket;
    },
    enabled: !!ticketId,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTicketInput) => {
      const { data } = await apiClient.post<{ ticket: SupportTicket }>("/support-tickets", input);
      return data.ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });
}

export function useAddTicketReply(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      const { data } = await apiClient.post(`/support-tickets/${ticketId}/replies`, { content });
      return data.reply;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });
}

export function useSetTicketStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await apiClient.patch(`/support-tickets/${id}/status`, { status });
      return data.ticket;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["support-tickets", variables.id] });
    },
  });
}
