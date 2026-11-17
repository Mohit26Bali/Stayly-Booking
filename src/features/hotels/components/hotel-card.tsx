"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Coffee, Heart, MapPin, PawPrint, Star } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/format";
import { useAuthStore } from "@/features/auth/store";
import { useWishlist, useToggleWishlist } from "@/features/hotels/hooks/use-wishlist";
import type { HotelCard as HotelCardType } from "@/types/hotel";

export function HotelCard({ hotel, view = "grid" }: { hotel: HotelCardType; view?: "grid" | "list" }) {
  const image = hotel.images[0];
  const user = useAuthStore((s) => s.user);
  const { data: wishlist } = useWishlist();
  const toggleWishlist = useToggleWishlist();
  const isSaved = !!wishlist?.some((item) => item.hotel.id === hotel.id);

  function onToggleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.info("Log in to save hotels to your wishlist.");
      return;
    }
    toggleWishlist.mutate(hotel.id);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <Link
        href={`/hotels/${hotel.slug}`}
        className={`group flex overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-lg ${
          view === "list" ? "flex-row" : "flex-col"
        }`}
      >
        <div
          className={`relative overflow-hidden bg-muted ${
            view === "list" ? "aspect-square w-56 shrink-0" : "aspect-4/3 w-full"
          }`}
        >
          {image ? (
            <Image
              src={image.url}
              alt={image.altText ?? hotel.name}
              fill
              sizes="(max-width: 768px) 100vw, 400px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No image
            </div>
          )}
          <div className="absolute left-3 top-3 flex gap-1.5">
            {hotel.breakfastIncluded && (
              <Badge className="bg-card/90 text-foreground backdrop-blur">
                <Coffee className="size-3" /> Breakfast
              </Badge>
            )}
            {hotel.petFriendly && (
              <Badge className="bg-card/90 text-foreground backdrop-blur">
                <PawPrint className="size-3" /> Pet friendly
              </Badge>
            )}
          </div>
          <button
            type="button"
            onClick={onToggleWishlist}
            aria-label={isSaved ? "Remove from wishlist" : "Save to wishlist"}
            className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-card/90 backdrop-blur transition-transform hover:scale-110"
          >
            <Heart className={`size-4 ${isSaved ? "fill-destructive text-destructive" : "text-foreground"}`} />
          </button>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold leading-snug text-foreground group-hover:text-primary">
              {hotel.name}
            </h3>
            <div className="flex shrink-0 items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
              <Star className="size-3 fill-current" />
              {hotel.avgRating.toFixed(1)}
            </div>
          </div>

          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5" />
            {hotel.city}, {hotel.country}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">{hotel.reviewCount} reviews</p>

          <div className="mt-auto flex items-end justify-between pt-4">
            <div>
              <span className="text-lg font-bold text-foreground">{formatINR(hotel.lowestPrice)}</span>
              <span className="text-sm text-muted-foreground"> / night</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function HotelCardSkeleton({ view = "grid" }: { view?: "grid" | "list" }) {
  return (
    <div
      className={`flex overflow-hidden rounded-2xl border border-border bg-card ${
        view === "list" ? "flex-row" : "flex-col"
      }`}
    >
      <div className={`animate-pulse bg-muted ${view === "list" ? "aspect-square w-56 shrink-0" : "aspect-4/3 w-full"}`} />
      <div className="flex-1 space-y-3 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-5 w-1/4 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
