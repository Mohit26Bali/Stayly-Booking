import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";
import type { Booking } from "@/types/booking";
import type { MonthlyPoint } from "@/server/dashboard/charts";

export interface OwnerHotelSummary {
  id: string;
  name: string;
  slug: string;
  city: string;
  country: string;
  status: string;
  avgRating: number;
  roomCount: number;
  bookingCount: number;
  image: string | null;
}

export interface OwnerReviewSummary {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  ownerReply: string | null;
  createdAt: string;
  hotel: { name: string };
  user: { email: string; profile: { firstName: string | null; lastName: string | null } | null };
}

export interface OwnerDashboardData {
  stats: {
    totalHotels: number;
    totalBookings: number;
    totalRevenue: number;
    todaysBookings: number;
  };
  hotels: OwnerHotelSummary[];
  recentBookings: (Booking & { user: { email: string; profile: { firstName: string | null; lastName: string | null } | null } })[];
  reviews: OwnerReviewSummary[];
  charts: {
    revenueTrend: MonthlyPoint[];
    bookingsByStatus: { status: string; label: string; count: number }[];
    popularRooms: { roomId: string; name: string; bookings: number }[];
  };
}

export function useOwnerDashboard() {
  return useQuery({
    queryKey: ["dashboard", "owner"],
    queryFn: async () => {
      const { data } = await apiClient.get<OwnerDashboardData>("/dashboard/owner");
      return data;
    },
  });
}
