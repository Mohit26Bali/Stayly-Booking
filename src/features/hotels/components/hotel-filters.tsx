"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatINR } from "@/lib/format";
import { useAmenities } from "@/features/hotels/hooks/use-hotels";

export interface FilterState {
  priceMin?: number;
  priceMax?: number;
  rating?: number;
  propertyType?: string;
  breakfastIncluded?: boolean;
  petFriendly?: boolean;
  amenities: string[];
}

const PROPERTY_TYPES = [
  { value: "HOTEL", label: "Hotel" },
  { value: "APARTMENT", label: "Apartment" },
  { value: "RESORT", label: "Resort" },
  { value: "VILLA", label: "Villa" },
  { value: "HOSTEL", label: "Hostel" },
  { value: "GUEST_HOUSE", label: "Guest house" },
  { value: "COTTAGE", label: "Cottage" },
];

export function HotelFilters({
  value,
  onChange,
}: {
  value: FilterState;
  onChange: (next: FilterState) => void;
}) {
  const { data: amenities = [] } = useAmenities();
  const [priceRange, setPriceRange] = useState<[number, number]>([
    value.priceMin ?? 0,
    value.priceMax ?? 20000,
  ]);

  function toggleAmenity(name: string) {
    const next = value.amenities.includes(name)
      ? value.amenities.filter((a) => a !== name)
      : [...value.amenities, name];
    onChange({ ...value, amenities: next });
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold">Price range</h3>
        <Slider
          className="mt-4"
          min={0}
          max={20000}
          step={500}
          value={priceRange}
          onValueChange={(v) => setPriceRange(v as [number, number])}
          onValueCommitted={(v) => {
            const [min, max] = v as [number, number];
            onChange({ ...value, priceMin: min, priceMax: max });
          }}
        />
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{formatINR(priceRange[0])}</span>
          <span>{formatINR(priceRange[1])}+</span>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-semibold">Minimum rating</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {[3, 3.5, 4, 4.5].map((r) => (
            <Button
              key={r}
              size="sm"
              variant={value.rating === r ? "default" : "outline"}
              onClick={() => onChange({ ...value, rating: value.rating === r ? undefined : r })}
            >
              <Star className="size-3 fill-current" />
              {r}+
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-semibold">Property type</h3>
        <div className="mt-3 space-y-2">
          {PROPERTY_TYPES.map((type) => (
            <label key={type.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={value.propertyType === type.value}
                onCheckedChange={(checked) =>
                  onChange({ ...value, propertyType: checked ? type.value : undefined })
                }
              />
              {type.label}
            </label>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-semibold">Amenities</h3>
        <div className="mt-3 space-y-2">
          {amenities.map((amenity) => (
            <label key={amenity.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={value.amenities.includes(amenity.name)}
                onCheckedChange={() => toggleAmenity(amenity.name)}
              />
              {amenity.name}
            </label>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={!!value.breakfastIncluded}
            onCheckedChange={(checked) =>
              onChange({ ...value, breakfastIncluded: checked === true ? true : undefined })
            }
          />
          Breakfast included
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={!!value.petFriendly}
            onCheckedChange={(checked) =>
              onChange({ ...value, petFriendly: checked === true ? true : undefined })
            }
          />
          Pet friendly
        </label>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="w-full"
        onClick={() =>
          onChange({ amenities: [] })
        }
      >
        Clear all filters
      </Button>
    </div>
  );
}
