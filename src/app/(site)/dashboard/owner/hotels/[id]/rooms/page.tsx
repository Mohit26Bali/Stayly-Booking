"use client";

import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Bed, Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";
import { RoomFormDialog } from "@/features/hotels/components/room-form-dialog";
import { useOwnerHotel, useDeleteRoom } from "@/features/hotels/hooks/use-hotel-mutations";

export default function ManageRoomsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: hotelId } = use(params);
  const { data: hotel, isLoading } = useOwnerHotel(hotelId);
  const deleteRoom = useDeleteRoom(hotelId);

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
          It may not exist, or it might not belong to your account.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/dashboard/owner"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to dashboard
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{hotel.name}</h1>
            <Badge variant={hotel.status === "APPROVED" ? "default" : "secondary"}>
              {hotel.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {hotel.city}, {hotel.country}
          </p>
        </div>
        <RoomFormDialog
          hotelId={hotelId}
          trigger={
            <Button>
              <Plus className="size-4" />
              Add room
            </Button>
          }
        />
      </div>

      {hotel.status === "PENDING" && (
        <div className="mt-6 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          This hotel is awaiting admin approval. It won&apos;t appear in search until it&apos;s
          approved <em>and</em> has at least one room with a price.
        </div>
      )}

      <div className="mt-8">
        {hotel.rooms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No rooms yet. A hotel can&apos;t be booked — or even show up in search — until it has
            at least one room.
            <div className="mt-4">
              <RoomFormDialog
                hotelId={hotelId}
                trigger={
                  <Button variant="outline">
                    <Plus className="size-4" />
                    Add your first room
                  </Button>
                }
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {hotel.rooms.map((room) => {
              const image = room.images[0];
              return (
                <div
                  key={room.id}
                  className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row"
                >
                  <div className="relative aspect-4/3 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:w-40">
                    {image ? (
                      <Image src={image.url} alt={room.name} fill sizes="160px" className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        No photo
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{room.name}</h3>
                        <p className="text-xs text-muted-foreground">{room.type}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <RoomFormDialog
                          hotelId={hotelId}
                          room={room}
                          trigger={
                            <Button variant="outline" size="icon" aria-label="Edit room">
                              <Pencil className="size-3.5" />
                            </Button>
                          }
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="Delete room"
                          disabled={deleteRoom.isPending}
                          onClick={() => {
                            deleteRoom.mutate(room.id, {
                              onSuccess: () => toast.success("Room deleted"),
                              onError: () => toast.error("Couldn't delete this room."),
                            });
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>

                    {room.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {room.description}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5" /> {room.maxGuests} guests
                      </span>
                      <span className="flex items-center gap-1">
                        <Bed className="size-3.5" /> {room.bedrooms} bedroom{room.bedrooms !== 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="mt-auto pt-4">
                      <span className="text-lg font-bold">{formatINR(Number(room.pricePerNight))}</span>
                      <span className="text-sm text-muted-foreground"> / night</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
