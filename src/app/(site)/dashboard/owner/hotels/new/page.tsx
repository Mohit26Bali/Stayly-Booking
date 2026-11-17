"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { Loader2 } from "lucide-react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { createHotelSchema } from "@/features/hotels/schemas/hotel.schema";
import { useCreateHotel } from "@/features/hotels/hooks/use-hotel-mutations";
import { useAmenities } from "@/features/hotels/hooks/use-hotels";

const PROPERTY_TYPES = [
  "HOTEL",
  "APARTMENT",
  "RESORT",
  "VILLA",
  "HOSTEL",
  "GUEST_HOUSE",
  "COTTAGE",
] as const;

type HotelFormInput = z.input<typeof createHotelSchema>;

const FEATURE_TOGGLES: { key: keyof HotelFormInput; label: string }[] = [
  { key: "hasWifi", label: "Free WiFi" },
  { key: "hasParking", label: "Free parking" },
  { key: "hasPool", label: "Swimming pool" },
  { key: "hasGym", label: "Gym" },
  { key: "hasSpa", label: "Spa" },
  { key: "hasRestaurant", label: "Restaurant" },
  { key: "breakfastIncluded", label: "Breakfast included" },
  { key: "petFriendly", label: "Pet friendly" },
  { key: "accessibility", label: "Accessibility features" },
];

export default function NewHotelPage() {
  const router = useRouter();
  const createHotel = useCreateHotel();
  const { data: amenities = [] } = useAmenities();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<HotelFormInput>({
    resolver: zodResolver(createHotelSchema),
    defaultValues: {
      propertyType: "HOTEL",
      checkInTime: "14:00",
      checkOutTime: "11:00",
      hasWifi: true,
      amenityIds: [],
    },
  });

  async function onSubmit(values: HotelFormInput) {
    try {
      await createHotel.mutateAsync(createHotelSchema.parse(values));
      toast.success("Hotel submitted for review", {
        description: "It will appear in search once an admin approves it.",
      });
      router.push("/dashboard/owner");
    } catch (error) {
      const message = isAxiosError(error)
        ? (error.response?.data as { error?: string })?.error
        : undefined;
      toast.error(message ?? "Couldn't create the hotel. Please check the form.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight">List a new property</h1>
      <p className="mt-1 text-muted-foreground">
        Submitted properties are reviewed by an admin before they appear in search.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8">
        <FieldGroup>
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="name">Property name</FieldLabel>
            <Input id="name" {...register("name")} />
            <FieldError errors={[errors.name]} />
          </Field>

          <Field data-invalid={!!errors.description}>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Textarea id="description" rows={4} {...register("description")} />
            <FieldError errors={[errors.description]} />
          </Field>

          <Field>
            <FieldLabel>Property type</FieldLabel>
            <Controller
              control={control}
              name="propertyType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field data-invalid={!!errors.addressLine}>
              <FieldLabel htmlFor="addressLine">Address</FieldLabel>
              <Input id="addressLine" {...register("addressLine")} />
              <FieldError errors={[errors.addressLine]} />
            </Field>
            <Field data-invalid={!!errors.city}>
              <FieldLabel htmlFor="city">City</FieldLabel>
              <Input id="city" {...register("city")} />
              <FieldError errors={[errors.city]} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field data-invalid={!!errors.country}>
              <FieldLabel htmlFor="country">Country</FieldLabel>
              <Input id="country" {...register("country")} />
              <FieldError errors={[errors.country]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="state">State / region</FieldLabel>
              <Input id="state" {...register("state")} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="checkInTime">Check-in time</FieldLabel>
              <Input id="checkInTime" type="time" {...register("checkInTime")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="checkOutTime">Check-out time</FieldLabel>
              <Input id="checkOutTime" type="time" {...register("checkOutTime")} />
            </Field>
          </div>

          <Field>
            <FieldLabel>Features</FieldLabel>
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-border p-4 sm:grid-cols-3">
              {FEATURE_TOGGLES.map((feature) => (
                <Controller
                  key={feature.key}
                  control={control}
                  name={feature.key}
                  render={({ field }) => (
                    <label className="flex items-center gap-2 text-sm">
                      <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                      {feature.label}
                    </label>
                  )}
                />
              ))}
            </div>
          </Field>

          {amenities.length > 0 && (
            <Field>
              <FieldLabel>Amenities</FieldLabel>
              <Controller
                control={control}
                name="amenityIds"
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-border p-4 sm:grid-cols-3">
                    {amenities.map((amenity) => (
                      <label key={amenity.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={field.value?.includes(amenity.id)}
                          onCheckedChange={(checked) => {
                            const current = field.value ?? [];
                            field.onChange(
                              checked
                                ? [...current, amenity.id]
                                : current.filter((id: string) => id !== amenity.id),
                            );
                          }}
                        />
                        {amenity.name}
                      </label>
                    ))}
                  </div>
                )}
              />
            </Field>
          )}

          <Field>
            <FieldLabel htmlFor="cancellationPolicy">Cancellation policy</FieldLabel>
            <Textarea id="cancellationPolicy" rows={2} {...register("cancellationPolicy")} />
          </Field>

          <Field>
            <FieldLabel htmlFor="houseRules">House rules</FieldLabel>
            <Textarea id="houseRules" rows={2} {...register("houseRules")} />
          </Field>

          <Button type="submit" size="lg" disabled={createHotel.isPending} className="w-fit">
            {createHotel.isPending && <Loader2 className="size-4 animate-spin" />}
            Submit for review
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}
