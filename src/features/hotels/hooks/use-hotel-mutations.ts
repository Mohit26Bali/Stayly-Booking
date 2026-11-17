import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";
import type { CreateHotelInput, CreateRoomInput, UpdateRoomInput } from "@/features/hotels/schemas/hotel.schema";
import type { OwnerHotelDetail } from "@/types/hotel";

export function useCreateHotel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateHotelInput) => {
      const { data } = await apiClient.post("/hotels", input);
      return data.hotel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", "owner"] });
    },
  });
}

export function useOwnerHotel(hotelId: string) {
  return useQuery({
    queryKey: ["hotels", "owner-detail", hotelId],
    queryFn: async () => {
      const { data } = await apiClient.get<{ hotel: OwnerHotelDetail }>(`/hotels/${hotelId}`);
      return data.hotel;
    },
    enabled: !!hotelId,
  });
}

export function useCreateRoom(hotelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateRoomInput) => {
      const { data } = await apiClient.post(`/hotels/${hotelId}/rooms`, input);
      return data.room;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels", "owner-detail", hotelId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "owner"] });
    },
  });
}

export function useUpdateRoom(hotelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, input }: { roomId: string; input: UpdateRoomInput }) => {
      const { data } = await apiClient.patch(`/hotels/${hotelId}/rooms/${roomId}`, input);
      return data.room;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels", "owner-detail", hotelId] });
    },
  });
}

export function useDeleteRoom(hotelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roomId: string) => {
      await apiClient.delete(`/hotels/${hotelId}/rooms/${roomId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels", "owner-detail", hotelId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "owner"] });
    },
  });
}
