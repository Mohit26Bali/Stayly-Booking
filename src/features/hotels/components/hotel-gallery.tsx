"use client";

import { useState } from "react";
import Image from "next/image";
import { Expand, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { HotelImage } from "@/types/hotel";

export function HotelGallery({ images, hotelName }: { images: HotelImage[]; hotelName: string }) {
  const [open, setOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  if (images.length === 0) {
    return <div className="aspect-21/9 w-full animate-pulse rounded-2xl bg-muted" />;
  }

  const [hero, ...rest] = images;
  const tiles = rest.slice(0, 5);
  const remainingCount = images.length - 1 - tiles.length;

  return (
    <>
      <div className="grid grid-cols-6 grid-rows-2 gap-2 overflow-hidden rounded-2xl">
        <button
          type="button"
          onClick={() => {
            setStartIndex(0);
            setOpen(true);
          }}
          className="group relative col-span-6 row-span-2 aspect-16/9 overflow-hidden sm:col-span-3"
        >
          <Image
            src={hero.url}
            alt={hero.altText ?? hotelName}
            fill
            priority
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </button>
        {tiles.map((image, i) => (
          <button
            type="button"
            key={image.id}
            onClick={() => {
              setStartIndex(i + 1);
              setOpen(true);
            }}
            className="group relative hidden aspect-square overflow-hidden sm:block"
          >
            <Image
              src={image.url}
              alt={image.altText ?? hotelName}
              fill
              sizes="17vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setStartIndex(0);
            setOpen(true);
          }}
          className="group relative hidden aspect-square flex-col items-center justify-center gap-1.5 bg-muted text-foreground transition-colors hover:bg-muted/70 sm:flex"
        >
          <Expand className="size-5 transition-transform duration-300 group-hover:scale-110" />
          <span className="text-xs font-medium">
            {remainingCount > 0 ? `+${remainingCount} more` : "View all"}
          </span>
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          setStartIndex(0);
          setOpen(true);
        }}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline underline-offset-4 sm:hidden"
      >
        <Expand className="size-3.5" />
        View all {images.length} photos
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">{hotelName} photos</DialogTitle>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-2 top-2 z-10 rounded-full bg-background/80 p-2"
            aria-label="Close gallery"
          >
            <X className="size-4" />
          </button>
          <Carousel opts={{ startIndex }} className="w-full">
            <CarouselContent>
              {images.map((image) => (
                <CarouselItem key={image.id}>
                  <div className="relative aspect-16/10 w-full overflow-hidden rounded-xl bg-black">
                    <Image
                      src={image.url}
                      alt={image.altText ?? hotelName}
                      fill
                      sizes="90vw"
                      className="object-contain"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
        </DialogContent>
      </Dialog>
    </>
  );
}
