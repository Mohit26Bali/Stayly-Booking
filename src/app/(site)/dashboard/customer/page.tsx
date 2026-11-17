"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Heart, Loader2, Star } from "lucide-react";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { useAuthStore } from "@/features/auth/store";
import { useMyBookings } from "@/features/bookings/hooks/use-bookings";
import { useProfile, useUpdateProfile } from "@/features/auth/hooks/use-profile";
import { useWishlist, useToggleWishlist } from "@/features/hotels/hooks/use-wishlist";
import { BookingListItem } from "@/features/bookings/components/booking-list-item";
import { formatINR } from "@/lib/format";
import { useReviewableBookings } from "@/features/reviews/hooks/use-reviews";
import { WriteReviewDialog } from "@/features/reviews/components/write-review-dialog";

const profileSchema = z.object({
  firstName: z.string().min(1, "Required").max(50),
  lastName: z.string().min(1, "Required").max(50),
  phone: z.string().max(30).optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
});
type ProfileInput = z.infer<typeof profileSchema>;

function BookingsPanel({ scope }: { scope: "upcoming" | "past" }) {
  const { data: bookings, isLoading } = useMyBookings(scope);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        No {scope} bookings yet.{" "}
        <Link href="/search" className="font-medium text-primary hover:underline">
          Start exploring stays
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <BookingListItem key={booking.id} booking={booking} />
      ))}
    </div>
  );
}

function ReviewsToWritePanel() {
  const { data: bookings, isLoading } = useReviewableBookings();

  if (isLoading || !bookings || bookings.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl border border-accent/30 bg-accent/5 p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Star className="size-4 text-accent" />
        Share your experience
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {bookings.map((booking) => (
          <WriteReviewDialog
            key={booking.id}
            bookingId={booking.id}
            hotelName={booking.hotel.name}
            trigger={
              <Button variant="outline" size="sm">
                Review {booking.hotel.name}
              </Button>
            }
          />
        ))}
      </div>
    </div>
  );
}

function WishlistPanel() {
  const { data: items, isLoading } = useWishlist();
  const toggleWishlist = useToggleWishlist();

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Nothing saved yet. Tap the heart icon on any stay to save it here.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const image = item.hotel.images[0];
        return (
          <div key={item.id} className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="relative aspect-4/3">
              <Link href={`/hotels/${item.hotel.slug}`}>
                {image && (
                  <Image
                    src={image.url}
                    alt={item.hotel.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                    className="object-cover"
                  />
                )}
              </Link>
              <button
                type="button"
                onClick={() => toggleWishlist.mutate(item.hotel.id)}
                className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-card/90"
                aria-label="Remove from wishlist"
              >
                <Heart className="size-4 fill-destructive text-destructive" />
              </button>
            </div>
            <div className="p-4">
              <Link href={`/hotels/${item.hotel.slug}`} className="font-semibold hover:text-primary">
                {item.hotel.name}
              </Link>
              <p className="text-sm text-muted-foreground">
                {item.hotel.city}, {item.hotel.country}
              </p>
              <p className="mt-2 font-bold">
                {formatINR(item.hotel.lowestPrice)} <span className="text-sm font-normal text-muted-foreground">/ night</span>
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProfilePanel() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const user = useAuthStore((s) => s.user);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileInput>({ resolver: zodResolver(profileSchema) });

  useEffect(() => {
    if (profile) {
      reset({
        firstName: profile.firstName ?? "",
        lastName: profile.lastName ?? "",
        phone: profile.phone ?? "",
        country: profile.country ?? "",
        city: profile.city ?? "",
        bio: profile.bio ?? "",
      });
    }
  }, [profile, reset]);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((values) =>
        updateProfile.mutate(values, {
          onSuccess: () => toast.success("Profile updated"),
          onError: () => toast.error("Couldn't update your profile"),
        }),
      )}
      className="max-w-xl"
    >
      <FieldGroup>
        <Field>
          <FieldLabel>Email</FieldLabel>
          <Input value={user?.email ?? ""} disabled />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={!!errors.firstName}>
            <FieldLabel htmlFor="firstName">First name</FieldLabel>
            <Input id="firstName" {...register("firstName")} />
            <FieldError errors={[errors.firstName]} />
          </Field>
          <Field data-invalid={!!errors.lastName}>
            <FieldLabel htmlFor="lastName">Last name</FieldLabel>
            <Input id="lastName" {...register("lastName")} />
            <FieldError errors={[errors.lastName]} />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="phone">Phone</FieldLabel>
          <Input id="phone" {...register("phone")} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="country">Country</FieldLabel>
            <Input id="country" {...register("country")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="city">City</FieldLabel>
            <Input id="city" {...register("city")} />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="bio">Bio</FieldLabel>
          <Textarea id="bio" rows={3} {...register("bio")} />
        </Field>
        <Button type="submit" disabled={updateProfile.isPending} className="w-fit">
          {updateProfile.isPending && <Loader2 className="size-4 animate-spin" />}
          Save changes
        </Button>
      </FieldGroup>
    </form>
  );
}

export default function CustomerDashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight">My account</h1>
      <p className="mt-1 text-muted-foreground">{user?.email}</p>

      <Tabs defaultValue="upcoming" className="mt-8">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past bookings</TabsTrigger>
          <TabsTrigger value="wishlist">Wishlist</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          <BookingsPanel scope="upcoming" />
        </TabsContent>
        <TabsContent value="past" className="mt-6">
          <ReviewsToWritePanel />
          <BookingsPanel scope="past" />
        </TabsContent>
        <TabsContent value="wishlist" className="mt-6">
          <WishlistPanel />
        </TabsContent>
        <TabsContent value="profile" className="mt-6">
          <ProfilePanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
