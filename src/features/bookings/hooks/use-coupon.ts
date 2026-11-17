import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";

export interface CouponPreview {
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  discountAmount: number;
}

export function useValidateCoupon() {
  return useMutation({
    mutationFn: async ({ code, amount }: { code: string; amount: number }) => {
      const { data } = await apiClient.post<CouponPreview>("/coupons/validate", { code, amount });
      return data;
    },
  });
}
