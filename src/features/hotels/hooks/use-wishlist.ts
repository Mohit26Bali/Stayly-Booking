import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";
import { useAuthStore } from "@/features/auth/store";
import type { HotelCard } from "@/types/hotel";

export interface WishlistItem {
  id: string;
  collection: string;
  createdAt: string;
  hotel: HotelCard;
}

export function useWishlist() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["wishlist"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ items: WishlistItem[] }>("/wishlist");
      return data.items;
    },
    enabled: !!user,
  });
}

export function useToggleWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (hotelId: string) => {
      const { data } = await apiClient.post<{ saved: boolean }>("/wishlist", { hotelId });
      return data.saved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });
}
