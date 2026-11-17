import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";
import type { Booking, CreateBookingResponse } from "@/types/booking";
import type { CreateBookingInput, CancelBookingInput } from "@/features/bookings/schemas/booking.schema";

export function useMyBookings(scope: "upcoming" | "past" | "all" = "all") {
  return useQuery({
    queryKey: ["bookings", "mine", scope],
    queryFn: async () => {
      const { data } = await apiClient.get<{ bookings: Booking[] }>(
        `/bookings?scope=${scope}`,
      );
      return data.bookings;
    },
  });
}

export function useBookingByRef(bookingRef: string) {
  return useQuery({
    queryKey: ["bookings", "ref", bookingRef],
    queryFn: async () => {
      const { data } = await apiClient.get<{ booking: Booking }>(`/bookings/ref/${bookingRef}`);
      return data.booking;
    },
    enabled: !!bookingRef,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBookingInput) => {
      const { data } = await apiClient.post<CreateBookingResponse>("/bookings/checkout", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useVerifyRazorpayPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      bookingId: string;
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => {
      const { bookingId, ...body } = params;
      const { data } = await apiClient.post<{ booking: Booking }>(
        `/bookings/${bookingId}/verify-payment`,
        body,
      );
      return data.booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string } & CancelBookingInput) => {
      const { data } = await apiClient.post<{ booking: Booking }>(`/bookings/${id}/cancel`, {
        reason,
      });
      return data.booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}
