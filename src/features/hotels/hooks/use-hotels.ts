import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";
import type { HotelSearchResult, HotelDetail, Amenity } from "@/types/hotel";

export interface HotelSearchParams {
  q?: string;
  city?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  priceMin?: number;
  priceMax?: number;
  rating?: number;
  propertyType?: string;
  roomType?: string;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  breakfastIncluded?: boolean;
  petFriendly?: boolean;
  sort?: "price_asc" | "price_desc" | "newest" | "rating" | "popular";
  page?: number;
  pageSize?: number;
}

function toSearchParams(params: HotelSearchParams): URLSearchParams {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      value.forEach((v) => searchParams.append(key, String(v)));
    } else {
      searchParams.set(key, String(value));
    }
  }
  return searchParams;
}

export function useHotelSearch(params: HotelSearchParams) {
  return useQuery({
    queryKey: ["hotels", "search", params],
    queryFn: async () => {
      const { data } = await apiClient.get<HotelSearchResult>(
        `/hotels?${toSearchParams(params).toString()}`,
      );
      return data;
    },
    placeholderData: (previous) => previous,
  });
}

export function useHotelDetail(slug: string) {
  return useQuery({
    queryKey: ["hotels", "detail", slug],
    queryFn: async () => {
      const { data } = await apiClient.get<{ hotel: HotelDetail }>(`/hotels/slug/${slug}`);
      return data.hotel;
    },
    enabled: !!slug,
  });
}

export function useDestinations() {
  return useQuery({
    queryKey: ["hotels", "destinations"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ destinations: { city: string; count: number }[] }>(
        "/hotels/destinations",
      );
      return data.destinations;
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useAmenities() {
  return useQuery({
    queryKey: ["amenities"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ amenities: Amenity[] }>("/amenities");
      return data.amenities;
    },
    staleTime: 10 * 60 * 1000,
  });
}
