"use client";

import Image from "next/image";
import { Bed, Maximize, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";
import type { Room } from "@/types/hotel";

export function RoomCard({
  room,
  selected,
  onSelect,
}: {
  room: Room;
  selected: boolean;
  onSelect: () => void;
}) {
  const image = room.images[0];

  return (
    <div
      className={`group flex flex-col gap-4 rounded-2xl border p-4 transition-colors sm:flex-row ${
        selected ? "border-primary bg-primary/5" : "border-border bg-card"
      }`}
    >
      <div className="relative aspect-4/3 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:w-48">
        {image && (
          <Image
            src={image.url}
            alt={room.name}
            fill
            sizes="200px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col">
        <h3 className="font-semibold">{room.name}</h3>
        {room.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{room.description}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="size-3.5" /> {room.maxGuests} guests
          </span>
          <span className="flex items-center gap-1">
            <Bed className="size-3.5" /> {room.bedrooms} bedroom{room.bedrooms !== 1 ? "s" : ""}
          </span>
          {room.sizeSqm && (
            <span className="flex items-center gap-1">
              <Maximize className="size-3.5" /> {room.sizeSqm} m&sup2;
            </span>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between pt-4">
          <div>
            <span className="text-lg font-bold">{formatINR(room.pricePerNight)}</span>
            <span className="text-sm text-muted-foreground"> / night</span>
          </div>
          <Button variant={selected ? "default" : "outline"} onClick={onSelect}>
            {selected ? "Selected" : "Select room"}
          </Button>
        </div>
      </div>
    </div>
  );
}
