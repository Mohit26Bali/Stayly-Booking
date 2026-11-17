import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";
import type { MonthlyPoint } from "@/server/dashboard/charts";

export interface AdminUserSummary {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  profile: { firstName: string | null; lastName: string | null } | null;
}

export interface AdminHotelSummary {
  id: string;
  name: string;
  city: string;
  country: string;
  status: string;
  createdAt: string;
  owner: { email: string; profile: { firstName: string | null; lastName: string | null } | null };
}

export interface AdminDashboardData {
  stats: {
    totalUsers: number;
    totalHotels: number;
    totalBookings: number;
    totalRevenue: number;
    pendingApprovals: number;
  };
  recentUsers: AdminUserSummary[];
  recentHotels: AdminHotelSummary[];
  pendingHotels: AdminHotelSummary[];
  charts: {
    revenueTrend: MonthlyPoint[];
    bookingTrend: MonthlyPoint[];
    customerGrowth: MonthlyPoint[];
    topHotels: { hotelId: string; name: string; revenue: number }[];
  };
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: ["dashboard", "admin"],
    queryFn: async () => {
      const { data } = await apiClient.get<AdminDashboardData>("/dashboard/admin");
      return data;
    },
  });
}

export function useSetHotelStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "APPROVED" | "REJECTED" | "SUSPENDED" }) => {
      const { data } = await apiClient.patch(`/admin/hotels/${id}/status`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", "admin"] });
    },
  });
}
