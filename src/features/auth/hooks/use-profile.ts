import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";

export interface Profile {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  country: string | null;
  city: string | null;
  bio: string | null;
}

export interface UpdateProfileInput {
  firstName: string;
  lastName: string;
  phone?: string;
  country?: string;
  city?: string;
  bio?: string;
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ profile: Profile | null }>("/profile");
      return data.profile;
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const { data } = await apiClient.patch<{ profile: Profile }>("/profile", input);
      return data.profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
