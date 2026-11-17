"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List, MapIcon, SearchX, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { HotelCard, HotelCardSkeleton } from "@/features/hotels/components/hotel-card";
import { HotelFilters, type FilterState } from "@/features/hotels/components/hotel-filters";
import { useHotelSearch } from "@/features/hotels/hooks/use-hotels";

const SORT_OPTIONS = [
  { value: "popular", label: "Most popular" },
  { value: "rating", label: "Highest rating" },
  { value: "price_asc", label: "Lowest price" },
  { value: "price_desc", label: "Highest price" },
  { value: "newest", label: "Newest" },
] as const;

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const city = searchParams.get("city") ?? "";
  const checkIn = searchParams.get("checkIn") ?? "";
  const checkOut = searchParams.get("checkOut") ?? "";
  const guests = Number(searchParams.get("guests") ?? "0");
  const sort = (searchParams.get("sort") as (typeof SORT_OPTIONS)[number]["value"]) ?? "popular";
  const page = Number(searchParams.get("page") ?? "1");
  const view = (searchParams.get("view") as "grid" | "list" | "map") ?? "grid";

  const [filters, setFilters] = useState<FilterState>({ amenities: [] });

  const searchQuery = useHotelSearch({
    q: q || undefined,
    city: city || undefined,
    checkIn: checkIn || undefined,
    checkOut: checkOut || undefined,
    guests: guests || undefined,
    sort,
    page,
    pageSize: 12,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
    rating: filters.rating,
    propertyType: filters.propertyType,
    breakfastIncluded: filters.breakfastIncluded,
    petFriendly: filters.petFriendly,
    amenities: filters.amenities,
  });

  function updateParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    router.push(`/search?${next.toString()}`, { scroll: false });
  }

  const heading = useMemo(() => {
    if (city) return `Stays in ${city}`;
    if (q) return `Results for "${q}"`;
    return "All stays";
  }, [city, q]);

  const data = searchQuery.data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
        <p className="text-sm text-muted-foreground">
          {searchQuery.isLoading ? "Searching..." : `${data?.total ?? 0} stays found`}
          {checkIn && checkOut && (
            <>
              {" "}
              &middot; {checkIn} to {checkOut}
            </>
          )}
          {guests > 0 && (
            <>
              {" "}
              &middot; {guests} guest{guests > 1 ? "s" : ""}
            </>
          )}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="outline" size="sm" className="lg:hidden" />
              }
            >
              <SlidersHorizontal className="size-4" />
              Filters
            </SheetTrigger>
            <SheetContent side="left" className="w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-8">
                <HotelFilters value={filters} onChange={setFilters} />
              </div>
            </SheetContent>
          </Sheet>

          <Tabs value={view} onValueChange={(v) => updateParam("view", v)}>
            <TabsList>
              <TabsTrigger value="grid">
                <LayoutGrid className="size-4" />
              </TabsTrigger>
              <TabsTrigger value="list">
                <List className="size-4" />
              </TabsTrigger>
              <TabsTrigger value="map">
                <MapIcon className="size-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Select value={sort} onValueChange={(v) => updateParam("sort", v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-border bg-card p-5">
            <HotelFilters value={filters} onChange={setFilters} />
          </div>
        </aside>

        <div>
          {view === "map" ? (
            <div className="flex h-96 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 text-center text-sm text-muted-foreground">
              <MapIcon className="mb-2 size-8" />
              Map view requires a Google Maps API key.
              <br />
              Add <code className="rounded bg-muted px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{" "}
              to enable it.
            </div>
          ) : searchQuery.isLoading ? (
            <div
              className={
                view === "list"
                  ? "flex flex-col gap-4"
                  : "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
              }
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <HotelCardSkeleton key={i} view={view} />
              ))}
            </div>
          ) : data && data.items.length > 0 ? (
            <>
              <div
                className={
                  view === "list"
                    ? "flex flex-col gap-4"
                    : "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
                }
              >
                {data.items.map((hotel) => (
                  <HotelCard key={hotel.id} hotel={hotel} view={view} />
                ))}
              </div>

              {data.totalPages > 1 && (
                <Pagination className="mt-10">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (page > 1) updateParam("page", String(page - 1));
                        }}
                      />
                    </PaginationItem>
                    {Array.from({ length: data.totalPages }).map((_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink
                          href="#"
                          isActive={page === i + 1}
                          onClick={(e) => {
                            e.preventDefault();
                            updateParam("page", String(i + 1));
                          }}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (page < data.totalPages) updateParam("page", String(page + 1));
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          ) : (
            <div className="flex h-96 flex-col items-center justify-center rounded-2xl border border-dashed border-border text-center text-muted-foreground">
              <SearchX className="mb-2 size-8" />
              No stays match your filters. Try widening your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchContent />
    </Suspense>
  );
}
