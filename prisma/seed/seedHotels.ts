import { prisma, faker, slugify, log, CITIES } from "./lib";
import { hotelGalleryImages } from "./localImages";
import type { Amenity, Hotel, User } from "../../src/generated/prisma/client";

const CATEGORIES = ["LUXURY_RESORT", "BOUTIQUE_HOTEL", "BUSINESS_HOTEL", "VILLA", "BUDGET_HOTEL"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_PROPERTY_TYPE: Record<Category, "RESORT" | "HOTEL" | "VILLA" | "GUEST_HOUSE"> = {
  LUXURY_RESORT: "RESORT",
  BOUTIQUE_HOTEL: "GUEST_HOUSE",
  BUSINESS_HOTEL: "HOTEL",
  VILLA: "VILLA",
  BUDGET_HOTEL: "HOTEL",
};

const CATEGORY_AMENITIES: Record<Category, string[]> = {
  LUXURY_RESORT: ["Free WiFi", "Swimming Pool", "Spa", "Gym", "Restaurant", "Room Service", "Air Conditioning", "Balcony", "Conference Room"],
  BOUTIQUE_HOTEL: ["Free WiFi", "Breakfast Included", "Workspace", "Balcony", "Air Conditioning", "Laundry", "Room Service"],
  BUSINESS_HOTEL: ["Free WiFi", "Workspace", "Conference Room", "Gym", "Parking", "Air Conditioning", "Elevator", "EV Charging"],
  VILLA: ["Swimming Pool", "Balcony", "Parking", "Free WiFi", "Pet Friendly", "Kids Play Area", "Air Conditioning"],
  BUDGET_HOTEL: ["Free WiFi", "Parking", "Air Conditioning", "Laundry", "Elevator"],
};

const COASTAL_CITIES = new Set(["Goa", "Mumbai"]);
const MOUNTAIN_CITIES = new Set(["Manali"]);

// Curated instead of faker.word.adjective() — that pool includes words like
// "Failing" or "Idolized" that read badly in a hotel name.
const PLEASANT_ADJECTIVES = [
  "Golden",
  "Royal",
  "Serene",
  "Grand",
  "Emerald",
  "Azure",
  "Radiant",
  "Tranquil",
  "Amber",
  "Regal",
  "Crimson",
  "Silver",
  "Heritage",
  "Sapphire",
  "Whispering",
];

const NAME_PATTERNS: Record<Category, (city: string) => string> = {
  LUXURY_RESORT: (city) => `The ${faker.helpers.arrayElement(PLEASANT_ADJECTIVES)} ${city} Resort & Spa`,
  BOUTIQUE_HOTEL: (city) => `${faker.person.lastName()}'s ${city} Boutique`,
  BUSINESS_HOTEL: (city) => `${city} Grand Business Hotel`,
  VILLA: (city) => `${faker.helpers.arrayElement(PLEASANT_ADJECTIVES)} ${city} Villa`,
  BUDGET_HOTEL: (city) => `${city} Comfort Stay`,
};

function capitalize(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function generateHotelName(city: string, category: Category): string {
  const raw = NAME_PATTERNS[category](city);
  return raw
    .split(" ")
    .map((w) => (w.length > 0 && w === w.toLowerCase() ? capitalize(w) : w))
    .join(" ");
}

function generateDescription(city: string, category: Category, highlight: string): string {
  const openers: Record<Category, string> = {
    LUXURY_RESORT: `A landmark luxury resort in ${city}, blending refined hospitality with destination-worthy amenities.`,
    BOUTIQUE_HOTEL: `A design-forward boutique stay tucked into the heart of ${city}, favored by travelers who want character over chain-hotel sameness.`,
    BUSINESS_HOTEL: `A modern business hotel in ${city} built for efficient stays, with reliable connectivity and meeting-ready spaces.`,
    VILLA: `A private villa retreat near ${city}, ideal for families and groups who want space and privacy without sacrificing comfort.`,
    BUDGET_HOTEL: `A clean, no-frills budget hotel in ${city} that covers the essentials well without inflating the price.`,
  };

  return `${openers[category]} ${highlight} Guests consistently mention the attentive staff and the convenient access to ${city}'s main attractions.`;
}

export interface SeedHotelsResult {
  hotels: Hotel[];
}

export async function seedHotels(
  owners: User[],
  amenities: Amenity[],
  count: number,
  slugPrefix: string,
): Promise<SeedHotelsResult> {
  log(`Seeding ${count} hotels across ${CITIES.length} cities`);
  const amenityByName = new Map(amenities.map((a) => [a.name, a.id]));
  const hotels: Hotel[] = [];

  for (let i = 0; i < count; i++) {
    const cityInfo = CITIES[i % CITIES.length];
    const category = CATEGORIES[i % CATEGORIES.length];
    const owner = owners[i % owners.length];
    const name = generateHotelName(cityInfo.city, category);
    const baseSlug = slugify(`${slugPrefix}-${name}-${cityInfo.city}-${i}`);

    const viewAmenity = COASTAL_CITIES.has(cityInfo.city)
      ? "Sea View"
      : MOUNTAIN_CITIES.has(cityInfo.city)
        ? "Mountain View"
        : null;

    const amenityNames = new Set(CATEGORY_AMENITIES[category]);
    if (viewAmenity) amenityNames.add(viewAmenity);
    if (faker.datatype.boolean({ probability: 0.4 })) amenityNames.add("Breakfast Included");

    const highlight = viewAmenity
      ? `Many rooms open onto a private balcony with a striking ${viewAmenity.toLowerCase()}.`
      : `The property is a short ride from ${cityInfo.city}'s old town and main markets.`;

    const starRating = category === "LUXURY_RESORT" ? 5 : category === "BUDGET_HOTEL" ? 3 : faker.number.int({ min: 3, max: 5 });

    const hotel = await prisma.hotel.create({
      data: {
        ownerId: owner.id,
        name,
        slug: baseSlug,
        description: generateDescription(cityInfo.city, category, highlight),
        propertyType: CATEGORY_PROPERTY_TYPE[category],
        category,
        starRating,
        status: "APPROVED",
        addressLine: faker.location.streetAddress(),
        city: cityInfo.city,
        state: cityInfo.state,
        country: cityInfo.country,
        postalCode: faker.location.zipCode(),
        latitude: cityInfo.lat + faker.number.float({ min: -0.05, max: 0.05, fractionDigits: 4 }),
        longitude: cityInfo.lng + faker.number.float({ min: -0.05, max: 0.05, fractionDigits: 4 }),
        hasWifi: amenityNames.has("Free WiFi"),
        hasParking: amenityNames.has("Parking"),
        hasPool: amenityNames.has("Swimming Pool"),
        hasGym: amenityNames.has("Gym"),
        hasSpa: amenityNames.has("Spa"),
        hasRestaurant: amenityNames.has("Restaurant"),
        petFriendly: amenityNames.has("Pet Friendly"),
        breakfastIncluded: amenityNames.has("Breakfast Included"),
        accessibility: faker.datatype.boolean({ probability: 0.2 }),
        cancellationPolicy: "Free cancellation up to 48 hours before check-in. Later cancellations are charged one night.",
        houseRules: "No smoking indoors. No parties or events. Valid photo ID required at check-in.",
        avgRating: 0,
        reviewCount: 0,
        images: {
          createMany: {
            data: hotelGalleryImages({
              category,
              city: cityInfo.city,
              hotelIndex: i,
              amenityNames,
            }).map((url, imgIndex) => ({
              url,
              position: imgIndex,
              altText: `${name} photo ${imgIndex + 1}`,
            })),
          },
        },
        amenities: {
          createMany: {
            data: [...amenityNames]
              .map((n) => amenityByName.get(n))
              .filter((id): id is string => !!id)
              .map((amenityId) => ({ amenityId })),
          },
        },
        nearbyAttractions: {
          createMany: {
            data: [
              { name: `${cityInfo.city} City Center`, distanceKm: faker.number.float({ min: 0.5, max: 3, fractionDigits: 1 }), category: "Landmark" },
              { name: `${cityInfo.city} Local Market`, distanceKm: faker.number.float({ min: 0.8, max: 4, fractionDigits: 1 }), category: "Shopping" },
            ],
          },
        },
      },
    });

    hotels.push(hotel);
  }

  return { hotels };
}

export function categoryForHotelIndex(index: number): Category {
  return CATEGORIES[index % CATEGORIES.length];
}
