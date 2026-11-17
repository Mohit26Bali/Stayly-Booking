"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { CheckCircle2, Download, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/format";
import { useBookingByRef } from "@/features/bookings/hooks/use-bookings";

export default function BookingConfirmationPage({
  params,
}: {
  params: Promise<{ bookingRef: string }>;
}) {
  const { bookingRef } = use(params);
  const { data: booking, isLoading } = useBookingByRef(bookingRef);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Booking not found</h1>
        <p className="mt-2 text-muted-foreground">
          We couldn&apos;t find this booking, or it doesn&apos;t belong to your account.
        </p>
      </div>
    );
  }

  const image = booking.hotel.images[0];
  const nights = Math.round(
    (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8"
    >
      <div className="flex flex-col items-center text-center">
        <CheckCircle2 className="size-14 text-success" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">
          {booking.status === "CONFIRMED" ? "Booking confirmed!" : "Booking received"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Confirmation code <span className="font-mono font-semibold">{booking.bookingRef}</span>
          . A confirmation email is on its way.
        </p>
      </div>

      <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex gap-4 border-b border-border p-5">
          {image && (
            <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
              <Image src={image.url} alt={booking.hotel.name} fill sizes="80px" className="object-cover" />
            </div>
          )}
          <div>
            <p className="font-semibold">{booking.hotel.name}</p>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5" />
              {booking.hotel.city}, {booking.hotel.country}
            </p>
            <Badge className="mt-2" variant={booking.status === "CONFIRMED" ? "default" : "secondary"}>
              {booking.status}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 p-5 text-sm sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">Check-in</p>
            <p className="font-medium">{format(new Date(booking.checkIn), "MMM d, yyyy")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Check-out</p>
            <p className="font-medium">{format(new Date(booking.checkOut), "MMM d, yyyy")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Nights</p>
            <p className="font-medium">{nights}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Guests</p>
            <p className="font-medium">{booking.guestsCount}</p>
          </div>
        </div>

        <div className="space-y-2 border-t border-border p-5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Room</span>
            <span>{booking.room.name}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatINR(booking.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Taxes &amp; fees</span>
            <span>{formatINR(booking.taxAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 font-semibold text-foreground">
            <span>Total paid</span>
            <span>{formatINR(booking.totalAmount)}</span>
          </div>
        </div>
      </div>

      <div className="no-print mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button variant="outline" onClick={() => window.print()}>
          <Download className="size-4" />
          Download receipt
        </Button>
        <Button render={<Link href="/dashboard/customer" />}>View my bookings</Button>
      </div>
    </motion.div>
  );
}
