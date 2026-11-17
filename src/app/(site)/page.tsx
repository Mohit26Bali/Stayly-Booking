"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { addDays, format } from "date-fns";
import {
  BadgeCheck,
  CalendarIcon,
  Mail,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HotelCard, HotelCardSkeleton } from "@/features/hotels/components/hotel-card";
import { HeroCarousel } from "@/features/home/components/hero-carousel";
import { useDestinations, useHotelSearch } from "@/features/hotels/hooks/use-hotels";

const POPULAR_DESTINATIONS = [
  { city: "Jaipur", country: "India", image: "/images/hotel_images/jaipur_hawa_mahal/jaipur_hawa_mahal_33290417.jpg" },
  { city: "Udaipur", country: "India", image: "/images/hotel_images/udaipur_lake_palace/udaipur_lake_palace_27960113.jpg" },
  { city: "Goa", country: "India", image: "/images/hotel_images/goa_beach/goa_beach_14665858.jpg" },
  { city: "Mumbai", country: "India", image: "/images/hotel_images/mumbai_skyline/mumbai_skyline_11505497.jpg" },
  { city: "Bengaluru", country: "India", image: "/images/hotel_images/bengaluru_city/bengaluru_city_14845309.jpg" },
  { city: "Delhi", country: "India", image: "/images/hotel_images/delhi_india_gate/delhi_india_gate_14523802.jpg" },
  { city: "Manali", country: "India", image: "/images/hotel_images/manali_mountains/manali_mountains_11538476.jpg" },
];

const TRUST_BADGES = [
  { icon: BadgeCheck, label: "Instant confirmation" },
  { icon: ShieldCheck, label: "Verified hosts" },
  { icon: Wallet, label: "Secure payments" },
];

const TESTIMONIALS = [
  {
    quote:
      "Booking my stay took less than two minutes, and the whole experience felt effortless.",
    name: "Priya S.",
    role: "Frequent traveler",
  },
  {
    quote: "Transparent pricing and no surprise fees at checkout. Exactly what I want from a booking site.",
    name: "Marcus L.",
    role: "Business traveler",
  },
  {
    quote: "The property photos matched reality perfectly — checked in without a single surprise.",
    name: "Elena R.",
    role: "Family vacationer",
  },
];

export default function Home() {
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [dates, setDates] = useState<{ checkIn?: Date; checkOut?: Date }>({});
  const [guests, setGuests] = useState(2);
  const [newsletterEmail, setNewsletterEmail] = useState("");

  const featuredQuery = useHotelSearch({ sort: "rating", pageSize: 6 });
  const destinationsQuery = useDestinations();
  const stayCounts = new Map(destinationsQuery.data?.map((d) => [d.city, d.count]));

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (destination.trim()) params.set("q", destination.trim());
    if (dates.checkIn) params.set("checkIn", format(dates.checkIn, "yyyy-MM-dd"));
    if (dates.checkOut) params.set("checkOut", format(dates.checkOut, "yyyy-MM-dd"));
    if (guests > 1) params.set("guests", String(guests));
    router.push(`/search${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function onSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    toast.success("You're subscribed! Watch your inbox for exclusive offers.");
    setNewsletterEmail("");
  }

  return (
    <div className="relative overflow-hidden">
      <section className="relative flex min-h-[640px] flex-col items-center justify-center px-4 py-20 text-center sm:px-6 lg:px-8">
        <HeroCarousel />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-linear-to-b from-black/70 via-black/45 to-black/70"
        />

        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
          <Sparkles className="size-3.5 text-accent" />
          Curated stays, transparent pricing
        </span>

        <h1 className="mt-8 max-w-3xl text-balance text-4xl font-bold tracking-tight text-white sm:text-6xl">
          Find your perfect stay,
          <span className="text-primary"> anywhere.</span>
        </h1>

        <p className="mt-6 max-w-xl text-balance text-lg text-white/85">
          Book hotels, resorts, and unique stays worldwide with instant confirmation and no
          hidden fees.
        </p>

        <form
          onSubmit={onSearch}
          className="mt-10 grid w-full max-w-4xl grid-cols-1 items-stretch gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-xl shadow-black/20 sm:grid-cols-[1.3fr_1fr_1fr_1fr_auto]"
        >
          <div className="flex items-center gap-2 bg-card px-4 py-3 text-left">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <div className="flex flex-1 flex-col">
              <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                Destination
              </span>
              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Where are you going?"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <Popover>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className="flex flex-col gap-0.5 bg-card px-4 py-3 text-left hover:bg-muted"
                />
              }
            >
              <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                Check in
              </span>
              <span className="flex items-center gap-1.5 text-sm">
                <CalendarIcon className="size-3.5 text-muted-foreground" />
                {dates.checkIn ? format(dates.checkIn, "MMM d") : "Add date"}
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dates.checkIn}
                onSelect={(date) =>
                  setDates((d) => ({
                    checkIn: date,
                    checkOut: d.checkOut && date && d.checkOut <= date ? undefined : d.checkOut,
                  }))
                }
                disabled={{ before: new Date() }}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className="flex flex-col gap-0.5 bg-card px-4 py-3 text-left hover:bg-muted"
                />
              }
            >
              <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                Check out
              </span>
              <span className="flex items-center gap-1.5 text-sm">
                <CalendarIcon className="size-3.5 text-muted-foreground" />
                {dates.checkOut ? format(dates.checkOut, "MMM d") : "Add date"}
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dates.checkOut}
                onSelect={(date) => setDates((d) => ({ ...d, checkOut: date }))}
                disabled={{ before: addDays(dates.checkIn ?? new Date(), 1) }}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className="flex flex-col gap-0.5 bg-card px-4 py-3 text-left hover:bg-muted"
                />
              }
            >
              <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                Guests
              </span>
              <span className="text-sm">
                {guests} guest{guests > 1 ? "s" : ""}
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-4" align="start">
              <div className="flex items-center justify-between">
                <span className="text-sm">Guests</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setGuests((g) => Math.max(1, g - 1))}
                    className="flex size-6 items-center justify-center rounded-full border border-border hover:bg-muted"
                    aria-label="Decrease guests"
                  >
                    <Minus className="size-3" />
                  </button>
                  <span className="w-4 text-center text-sm">{guests}</span>
                  <button
                    type="button"
                    onClick={() => setGuests((g) => Math.min(20, g + 1))}
                    className="flex size-6 items-center justify-center rounded-full border border-border hover:bg-muted"
                    aria-label="Increase guests"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <div className="bg-card p-2">
            <Button type="submit" size="lg" className="h-full w-full rounded-xl">
              Search
            </Button>
          </div>
        </form>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {TRUST_BADGES.map((badge) => (
            <div key={badge.label} className="flex items-center gap-2 text-sm text-white/85">
              <badge.icon className="size-4 text-success" />
              {badge.label}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Popular destinations</h2>
        </div>
        <div className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-7 lg:overflow-visible lg:pb-0">
          {POPULAR_DESTINATIONS.map((dest, i) => (
            <motion.div
              key={dest.city}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="w-32 shrink-0 snap-start sm:w-40 lg:w-auto"
            >
              <Link
                href={`/search?city=${encodeURIComponent(dest.city)}`}
                className="group relative block aspect-3/4 overflow-hidden rounded-2xl"
              >
                <Image
                  src={dest.image}
                  alt={dest.city}
                  fill
                  sizes="200px"
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-3 left-3 text-white">
                  <p className="font-semibold">{dest.city}</p>
                  <p className="text-xs text-white/80">
                    {stayCounts.has(dest.city)
                      ? `${stayCounts.get(dest.city)} stay${stayCounts.get(dest.city) === 1 ? "" : "s"}`
                      : dest.country}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Featured stays</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Highly rated properties handpicked for you
            </p>
          </div>
          <Button variant="ghost" render={<Link href="/search" />}>
            View all
          </Button>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featuredQuery.isLoading
            ? Array.from({ length: 6 }).map((_, i) => <HotelCardSkeleton key={i} />)
            : featuredQuery.data?.items.map((hotel) => (
                <HotelCard key={hotel.id} hotel={hotel} />
              ))}
        </div>
      </section>

      <section className="bg-secondary py-24 text-secondary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold tracking-tight">
            Loved by travelers worldwide
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.1 }}
                className="rounded-2xl border border-secondary-foreground/10 bg-secondary-foreground/5 p-6"
              >
                <div className="flex gap-1 text-accent">
                  {Array.from({ length: 5 }).map((_, star) => (
                    <Star key={star} className="size-4 fill-current" />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-secondary-foreground/90">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <p className="mt-4 text-sm font-medium">{t.name}</p>
                <p className="text-xs text-secondary-foreground/60">{t.role}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <Mail className="mx-auto size-8 text-primary" />
        <h2 className="mt-4 text-2xl font-bold tracking-tight">Get exclusive offers</h2>
        <p className="mt-2 text-muted-foreground">
          Subscribe for price drop alerts and members-only deals.
        </p>
        <form onSubmit={onSubscribe} className="mx-auto mt-6 flex max-w-md gap-2">
          <Input
            type="email"
            required
            placeholder="you@example.com"
            value={newsletterEmail}
            onChange={(e) => setNewsletterEmail(e.target.value)}
          />
          <Button type="submit">Subscribe</Button>
        </form>
      </section>
    </div>
  );
}
