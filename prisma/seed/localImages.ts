import fs from "node:fs";
import path from "node:path";

const PUBLIC_ROOT = path.join(process.cwd(), "public", "images");

function listFolder(kind: "hotel_images" | "avatars", folder: string): string[] {
  const dir = path.join(PUBLIC_ROOT, kind, folder);
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort()
    .map((f) => `/images/${kind}/${folder}/${f}`);
}

// ---------------------------------------------------------------------------
// Hotel exteriors, by category
// ---------------------------------------------------------------------------

export const CATEGORY_EXTERIOR_FOLDER: Record<string, string> = {
  LUXURY_RESORT: "luxury_resort_exterior",
  BOUTIQUE_HOTEL: "boutique_hotel_exterior",
  BUSINESS_HOTEL: "modern_business_hotel_building",
  VILLA: "villa_exterior_tropical",
  BUDGET_HOTEL: "budget_hotel_exterior",
};

const EXTERIOR_POOLS = new Map<string, string[]>(
  Object.values(CATEGORY_EXTERIOR_FOLDER).map((folder) => [folder, listFolder("hotel_images", folder)]),
);

const LOBBY_POOL = listFolder("hotel_images", "hotel_lobby_interior");
const GENERIC_ROOM_POOL = listFolder("hotel_images", "hotel_room_interior");

// ---------------------------------------------------------------------------
// Amenity photos
// ---------------------------------------------------------------------------

const AMENITY_FOLDER: Record<string, string> = {
  "Swimming Pool": "hotel_swimming_pool",
  Spa: "hotel_spa",
  Restaurant: "hotel_restaurant_interior",
  Gym: "hotel_gym_fitness_center",
  "Breakfast Included": "hotel_breakfast_buffet",
};

const AMENITY_POOLS = new Map<string, string[]>(
  Object.values(AMENITY_FOLDER).map((folder) => [folder, listFolder("hotel_images", folder)]),
);

// ---------------------------------------------------------------------------
// Destination / city photos
// ---------------------------------------------------------------------------

const CITY_FOLDER: Record<string, string> = {
  Jaipur: "jaipur_hawa_mahal",
  Udaipur: "udaipur_lake_palace",
  Goa: "goa_beach",
  Mumbai: "mumbai_skyline",
  Bengaluru: "bengaluru_city",
  Delhi: "delhi_india_gate",
  Manali: "manali_mountains",
};

const CITY_POOLS = new Map<string, string[]>(
  Object.values(CITY_FOLDER).map((folder) => [folder, listFolder("hotel_images", folder)]),
);

// ---------------------------------------------------------------------------
// Room interiors, by room type
// ---------------------------------------------------------------------------

const ROOM_TYPE_FOLDER: Record<string, string> = {
  DELUXE: "hotel_deluxe_room_interior",
  PREMIUM: "hotel_room_interior",
  FAMILY: "family_hotel_room_two_beds",
  SUITE: "hotel_suite_interior",
  PRESIDENTIAL: "presidential_suite_luxury_hotel",
};

const ROOM_TYPE_POOLS = new Map<string, string[]>(
  Object.values(ROOM_TYPE_FOLDER).map((folder) => [folder, listFolder("hotel_images", folder)]),
);

// ---------------------------------------------------------------------------
// Avatars
// ---------------------------------------------------------------------------

const AVATAR_FOLDERS = [
  "young_woman_portrait_smiling",
  "young_man_portrait_smiling",
  "business_portrait_professional",
  "senior_portrait_smiling",
  "person_portrait_casual",
];

const AVATAR_POOL: string[] = AVATAR_FOLDERS.flatMap((folder) => listFolder("avatars", folder));

function at(pool: string[], index: number): string {
  return pool[((index % pool.length) + pool.length) % pool.length];
}

/** Six curated, non-repeating photos for one hotel's gallery. */
export function hotelGalleryImages(params: {
  category: string;
  city: string;
  hotelIndex: number;
  amenityNames: Set<string>;
}): string[] {
  const { category, city, hotelIndex, amenityNames } = params;
  const exteriorPool = EXTERIOR_POOLS.get(CATEGORY_EXTERIOR_FOLDER[category]) ?? LOBBY_POOL;
  const cityPool = CITY_POOLS.get(CITY_FOLDER[city]) ?? LOBBY_POOL;

  const matchedAmenity = Object.keys(AMENITY_FOLDER).find((name) => amenityNames.has(name));
  const amenityPool = matchedAmenity
    ? (AMENITY_POOLS.get(AMENITY_FOLDER[matchedAmenity]) ?? LOBBY_POOL)
    : LOBBY_POOL;

  return [
    at(exteriorPool, hotelIndex),
    at(exteriorPool, hotelIndex + Math.floor(exteriorPool.length / 2)),
    at(LOBBY_POOL, hotelIndex),
    at(amenityPool, hotelIndex),
    at(GENERIC_ROOM_POOL, hotelIndex),
    at(cityPool, hotelIndex),
  ];
}

/** Three photos for one room's gallery, matched to its room type. */
export function roomGalleryImages(params: { roomType: string; seedIndex: number }): string[] {
  const pool = ROOM_TYPE_POOLS.get(ROOM_TYPE_FOLDER[params.roomType]) ?? GENERIC_ROOM_POOL;
  return [
    at(pool, params.seedIndex),
    at(pool, params.seedIndex + 1),
    at(pool, params.seedIndex + 2),
  ];
}

/** One deterministic avatar photo per person, spread evenly across the pool. */
export function avatarImage(seedIndex: number): string {
  return at(AVATAR_POOL, seedIndex);
}
