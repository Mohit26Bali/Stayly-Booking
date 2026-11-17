"use client";

import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";
import { useCancelBooking } from "@/features/bookings/hooks/use-bookings";
import type { Booking } from "@/types/booking";

const STATUS_VARIANT: Record<Booking["status"], "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  CONFIRMED: "default",
  CANCELLED: "destructive",
  COMPLETED: "outline",
  REFUNDED: "outline",
  EXPIRED: "destructive",
};

export function BookingListItem({ booking }: { booking: Booking }) {
  const cancelBooking = useCancelBooking();
  const image = booking.hotel.images[0];
  const canCancel = booking.status === "PENDING" || booking.status === "CONFIRMED";

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row">
      <Link href={`/hotels/${booking.hotel.slug}`} className="relative aspect-4/3 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:w-40">
        {image && (
          <Image src={image.url} alt={booking.hotel.name} fill sizes="160px" className="object-cover" />
        )}
      </Link>

      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link href={`/hotels/${booking.hotel.slug}`} className="font-semibold hover:text-primary">
              {booking.hotel.name}
            </Link>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5" />
              {booking.hotel.city}, {booking.hotel.country}
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[booking.status]}>{booking.status}</Badge>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <span>{booking.room.name}</span>
          <span>
            {format(new Date(booking.checkIn), "MMM d")} –{" "}
            {format(new Date(booking.checkOut), "MMM d, yyyy")}
          </span>
          <span>{booking.guestsCount} guests</span>
          <span className="font-mono text-xs">{booking.bookingRef}</span>
        </div>

        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="text-lg font-bold">{formatINR(booking.totalAmount)}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" render={<Link href={`/booking/confirmation/${booking.bookingRef}`} />}>
              View details
            </Button>
            {canCancel && (
              <Button
                variant="destructive"
                size="sm"
                disabled={cancelBooking.isPending}
                onClick={() => {
                  cancelBooking.mutate(
                    { id: booking.id },
                    {
                      onSuccess: () => toast.success("Booking cancelled"),
                      onError: () => toast.error("Couldn't cancel this booking"),
                    },
                  );
                }}
              >
                {cancelBooking.isPending && <Loader2 className="size-3.5 animate-spin" />}
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
