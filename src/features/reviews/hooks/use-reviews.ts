import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";
import type { CreateReviewInput } from "@/features/reviews/schemas/review.schema";
import type { Booking } from "@/types/booking";

export function useReviewableBookings() {
  return useQuery({
    queryKey: ["reviews", "reviewable"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ bookings: Booking[] }>("/reviews/reviewable");
      return data.bookings;
    },
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateReviewInput) => {
      const { data } = await apiClient.post("/reviews", input);
      return data.review;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["hotels"] });
    },
  });
}

export function useReplyToReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reply }: { id: string; reply: string }) => {
      const { data } = await apiClient.post(`/reviews/${id}/reply`, { reply });
      return data.review;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "owner"] });
    },
  });
}

export function useToggleHelpful() {
  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { data } = await apiClient.post<{ helpful: boolean }>(`/reviews/${reviewId}/helpful`);
      return data.helpful;
    },
  });
}
