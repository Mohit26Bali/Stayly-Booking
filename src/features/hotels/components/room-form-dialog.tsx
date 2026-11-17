"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel } from "@/components/ui/field";
import { useCreateRoom, useUpdateRoom } from "@/features/hotels/hooks/use-hotel-mutations";
import type { Room, RoomType } from "@/types/hotel";

const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: "SINGLE", label: "Single" },
  { value: "DOUBLE", label: "Double" },
  { value: "TWIN", label: "Twin" },
  { value: "DELUXE", label: "Deluxe" },
  { value: "PREMIUM", label: "Premium" },
  { value: "SUITE", label: "Suite" },
  { value: "FAMILY", label: "Family" },
  { value: "PRESIDENTIAL", label: "Presidential" },
  { value: "DORMITORY", label: "Dormitory" },
];

interface RoomFormState {
  name: string;
  type: RoomType;
  description: string;
  pricePerNight: string;
  maxGuests: string;
  bedrooms: string;
  bathrooms: string;
  totalUnits: string;
  sizeSqm: string;
}

function toFormState(room?: Room): RoomFormState {
  return {
    name: room?.name ?? "",
    type: room?.type ?? "DELUXE",
    description: room?.description ?? "",
    pricePerNight: room?.pricePerNight ?? "",
    maxGuests: room ? String(room.maxGuests) : "2",
    bedrooms: room ? String(room.bedrooms) : "1",
    bathrooms: room ? String(room.bathrooms) : "1",
    totalUnits: room ? String(room.totalUnits) : "1",
    sizeSqm: room?.sizeSqm ? String(room.sizeSqm) : "",
  };
}

export function RoomFormDialog({
  hotelId,
  room,
  trigger,
}: {
  hotelId: string;
  room?: Room;
  trigger: React.ReactElement;
}) {
  const isEditing = !!room;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<RoomFormState>(() => toFormState(room));
  const createRoom = useCreateRoom(hotelId);
  const updateRoom = useUpdateRoom(hotelId);
  const isPending = createRoom.isPending || updateRoom.isPending;

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) setForm(toFormState(room));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const input = {
      name: form.name,
      type: form.type,
      description: form.description || undefined,
      pricePerNight: Number(form.pricePerNight),
      maxGuests: Number(form.maxGuests),
      bedrooms: Number(form.bedrooms),
      bathrooms: Number(form.bathrooms),
      totalUnits: Number(form.totalUnits),
      sizeSqm: form.sizeSqm ? Number(form.sizeSqm) : undefined,
    };

    try {
      if (isEditing) {
        await updateRoom.mutateAsync({ roomId: room.id, input });
        toast.success("Room updated");
      } else {
        await createRoom.mutateAsync(input);
        toast.success("Room added");
      }
      setOpen(false);
    } catch (error) {
      const message = isAxiosError(error)
        ? (error.response?.data as { error?: string })?.error
        : undefined;
      toast.error(message ?? "Couldn't save this room. Check the form and try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit room" : "Add a room"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="room-name">Room name</FieldLabel>
            <Input
              id="room-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Deluxe Room"
              required
            />
          </Field>

          <Field>
            <FieldLabel>Room type</FieldLabel>
            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as RoomType }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROOM_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="room-description">Description (optional)</FieldLabel>
            <Textarea
              id="room-description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What makes this room worth booking?"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="room-price">Price per night (₹)</FieldLabel>
              <Input
                id="room-price"
                type="number"
                min={1}
                step="1"
                value={form.pricePerNight}
                onChange={(e) => setForm((f) => ({ ...f, pricePerNight: e.target.value }))}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="room-units">Number of units</FieldLabel>
              <Input
                id="room-units"
                type="number"
                min={1}
                max={500}
                value={form.totalUnits}
                onChange={(e) => setForm((f) => ({ ...f, totalUnits: e.target.value }))}
                required
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field>
              <FieldLabel htmlFor="room-guests">Max guests</FieldLabel>
              <Input
                id="room-guests"
                type="number"
                min={1}
                max={20}
                value={form.maxGuests}
                onChange={(e) => setForm((f) => ({ ...f, maxGuests: e.target.value }))}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="room-bedrooms">Bedrooms</FieldLabel>
              <Input
                id="room-bedrooms"
                type="number"
                min={0}
                max={10}
                value={form.bedrooms}
                onChange={(e) => setForm((f) => ({ ...f, bedrooms: e.target.value }))}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="room-bathrooms">Bathrooms</FieldLabel>
              <Input
                id="room-bathrooms"
                type="number"
                min={0}
                max={10}
                value={form.bathrooms}
                onChange={(e) => setForm((f) => ({ ...f, bathrooms: e.target.value }))}
                required
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="room-size">Size in m&sup2; (optional)</FieldLabel>
            <Input
              id="room-size"
              type="number"
              min={1}
              value={form.sizeSqm}
              onChange={(e) => setForm((f) => ({ ...f, sizeSqm: e.target.value }))}
            />
          </Field>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isEditing ? "Save changes" : "Add room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
