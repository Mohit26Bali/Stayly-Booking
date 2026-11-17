import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";

export interface RoomWithHotel {
  id: string;
  name: string;
  type: string;
  pricePerNight: string;
  maxGuests: number;
  totalUnits: number;
  images: { id: string; url: string }[];
  hotel: {
    id: string;
    name: string;
    slug: string;
    city: string;
    country: string;
    images: { id: string; url: string }[];
  };
}

export function useRoomDetail(roomId: string) {
  return useQuery({
    queryKey: ["rooms", roomId],
    queryFn: async () => {
      const { data } = await apiClient.get<{ room: RoomWithHotel }>(`/rooms/${roomId}`);
      return data.room;
    },
    enabled: !!roomId,
  });
}
