"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import { CalendarIcon, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatINR } from "@/lib/format";
import type { Room } from "@/types/hotel";

export function BookingWidget({ rooms, selectedRoom }: { rooms: Room[]; selectedRoom: Room | null }) {
  const router = useRouter();
  const [range, setRange] = useState<{ from: Date; to: Date }>({
    from: new Date(),
    to: addDays(new Date(), 2),
  });
  const [guests, setGuests] = useState(2);

  const nights = Math.max(1, differenceInCalendarDays(range.to, range.from));
  const room = selectedRoom ?? rooms[0] ?? null;
  const pricePerNight = room ? Number(room.pricePerNight) : 0;
  const subtotal = pricePerNight * nights;
  const taxes = Math.round(subtotal * 0.12 * 100) / 100;
  const total = subtotal + taxes;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/5">
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold">{pricePerNight ? formatINR(pricePerNight) : "—"}</span>
        <span className="text-sm text-muted-foreground">/ night</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border">
        <Popover>
          <PopoverTrigger
            render={
              <button
                type="button"
                className="flex flex-col gap-0.5 bg-card px-3 py-2 text-left hover:bg-muted"
              />
            }
          >
            <span className="text-[11px] font-semibold uppercase text-muted-foreground">
              Check-in
            </span>
            <span className="flex items-center gap-1 text-sm">
              <CalendarIcon className="size-3.5" />
              {format(range.from, "MMM d, yyyy")}
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={range.from}
              onSelect={(date) => date && setRange((r) => ({ ...r, from: date }))}
              disabled={{ before: new Date() }}
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger
            render={
              <button
                type="button"
                className="flex flex-col gap-0.5 bg-card px-3 py-2 text-left hover:bg-muted"
              />
            }
          >
            <span className="text-[11px] font-semibold uppercase text-muted-foreground">
              Check-out
            </span>
            <span className="flex items-center gap-1 text-sm">
              <CalendarIcon className="size-3.5" />
              {format(range.to, "MMM d, yyyy")}
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={range.to}
              onSelect={(date) => date && setRange((r) => ({ ...r, to: date }))}
              disabled={{ before: addDays(range.from, 1) }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl border border-border px-3 py-2">
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
            onClick={() => setGuests((g) => Math.min(room?.maxGuests ?? 10, g + 1))}
            className="flex size-6 items-center justify-center rounded-full border border-border hover:bg-muted"
            aria-label="Increase guests"
          >
            <Plus className="size-3" />
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>
            {formatINR(pricePerNight)} &times; {nights} night{nights > 1 ? "s" : ""}
          </span>
          <span>{formatINR(subtotal)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Taxes &amp; fees</span>
          <span>{formatINR(taxes)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2 font-semibold text-foreground">
          <span>Total</span>
          <span>{formatINR(total)}</span>
        </div>
      </div>

      <Button
        size="lg"
        className="mt-4 w-full"
        disabled={!room}
        onClick={() => {
          if (!room) return;
          const params = new URLSearchParams({
            checkIn: format(range.from, "yyyy-MM-dd"),
            checkOut: format(range.to, "yyyy-MM-dd"),
            guests: String(guests),
          });
          router.push(`/booking/checkout/${room.id}?${params.toString()}`);
        }}
      >
        Reserve
      </Button>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        You won&apos;t be charged yet
      </p>
    </div>
  );
}
