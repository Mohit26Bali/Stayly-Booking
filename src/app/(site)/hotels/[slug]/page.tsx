"use client";

import { use, useState } from "react";
import {
  Loader2,
  MapPin,
  Star,
  ShieldCheck,
  Clock,
  Ban,
} from "lucide-react";
import { motion } from "framer-motion";
import { useHotelDetail } from "@/features/hotels/hooks/use-hotels";
import { HotelGallery } from "@/features/hotels/components/hotel-gallery";
import { AmenityIcon } from "@/features/hotels/components/amenity-icon";
import { RoomCard } from "@/features/hotels/components/room-card";
import { BookingWidget } from "@/features/hotels/components/booking-widget";
import { MessageHostDialog } from "@/features/messages/components/message-host-dialog";
import { ReviewCard } from "@/features/reviews/components/review-card";
import { Badge } from "@/components/ui/badge";
import { HotelCard } from "@/features/hotels/components/hotel-card";
import { useHotelSearch } from "@/features/hotels/hooks/use-hotels";
import type { Room } from "@/types/hotel";

export default function HotelDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data: hotel, isLoading } = useHotelDetail(slug);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const recommendedQuery = useHotelSearch({ city: hotel?.city, pageSize: 3 });
  const recommended = recommendedQuery.data?.items.filter((h) => h.slug !== slug) ?? [];

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Hotel not found</h1>
        <p className="mt-2 text-muted-foreground">
          This listing may have been removed or is no longer available.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{hotel.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1 font-medium text-foreground">
              <Star className="size-4 fill-current text-accent" />
              {hotel.avgRating.toFixed(1)} ({hotel.reviewCount} reviews)
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="size-4" />
              {hotel.addressLine}, {hotel.city}, {hotel.country}
            </span>
          </div>
        </div>
        <Badge variant="outline" className="text-sm">
          {hotel.propertyType.replace("_", " ")}
        </Badge>
      </div>

      <div className="mt-6">
        <HotelGallery images={hotel.images} hotelName={hotel.name} />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-10">
          <section>
            <h2 className="text-xl font-semibold">About this property</h2>
            <p className="mt-3 whitespace-pre-line text-muted-foreground">{hotel.description}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Amenities</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {hotel.amenities.map(({ amenity }) => (
                <div key={amenity.id} className="flex items-center gap-2 text-sm">
                  <AmenityIcon name={amenity.name} className="size-4 text-primary" />
                  {amenity.name}
                </div>
              ))}
            </div>
          </section>

          <section id="rooms">
            <h2 className="text-xl font-semibold">Available rooms</h2>
            <div className="mt-4 space-y-4">
              {hotel.rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  selected={selectedRoom?.id === room.id}
                  onSelect={() => setSelectedRoom(room)}
                />
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Policies</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex gap-3 rounded-xl border border-border p-4">
                <Clock className="size-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">Check-in / Check-out</p>
                  <p className="text-sm text-muted-foreground">
                    From {hotel.checkInTime} · Until {hotel.checkOutTime}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 rounded-xl border border-border p-4">
                <ShieldCheck className="size-5 shrink-0 text-success" />
                <div>
                  <p className="text-sm font-medium">Cancellation policy</p>
                  <p className="text-sm text-muted-foreground">
                    {hotel.cancellationPolicy ?? "Contact the property for details."}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 rounded-xl border border-border p-4 sm:col-span-2">
                <Ban className="size-5 shrink-0 text-destructive" />
                <div>
                  <p className="text-sm font-medium">House rules</p>
                  <p className="text-sm text-muted-foreground">
                    {hotel.houseRules ?? "No specific rules listed."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {hotel.nearbyAttractions.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold">Nearby attractions</h2>
              <ul className="mt-4 space-y-2">
                {hotel.nearbyAttractions.map((a) => (
                  <li key={a.id} className="flex justify-between text-sm">
                    <span>{a.name}</span>
                    <span className="text-muted-foreground">{a.distanceKm} km</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-xl font-semibold">
              Reviews ({hotel.reviewCount})
            </h2>
            {hotel.reviews.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No reviews yet.</p>
            ) : (
              <div className="mt-4 space-y-5">
                {hotel.reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-3 lg:sticky lg:top-24 lg:h-fit">
          <BookingWidget rooms={hotel.rooms} selectedRoom={selectedRoom} />
          <MessageHostDialog hotelId={hotel.id} hotelName={hotel.name} />
        </div>
      </div>

      {recommended.length > 0 && (
        <section className="mt-16">
          <h2 className="text-xl font-semibold">More stays in {hotel.city}</h2>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.map((h) => (
              <HotelCard key={h.id} hotel={h} />
            ))}
          </div>
        </section>
      )}
    </motion.div>
  );
}
