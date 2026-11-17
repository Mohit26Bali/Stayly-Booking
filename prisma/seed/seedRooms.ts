import { prisma, faker, log } from "./lib";
import { roomGalleryImages } from "./localImages";
import { categoryForHotelIndex } from "./seedHotels";
import type { Hotel, Room } from "../../src/generated/prisma/client";

const ROOM_TYPES = ["DELUXE", "PREMIUM", "FAMILY", "SUITE", "PRESIDENTIAL"] as const;
type RoomTypeName = (typeof ROOM_TYPES)[number];

const ROOM_TYPE_LABEL: Record<RoomTypeName, string> = {
  DELUXE: "Deluxe Room",
  PREMIUM: "Premium Room",
  FAMILY: "Family Room",
  SUITE: "Suite",
  PRESIDENTIAL: "Presidential Suite",
};

const ROOM_TYPE_TIER: Record<RoomTypeName, { guests: number; bedrooms: number; bathrooms: number; sizeSqm: [number, number]; priceMultiplier: number }> = {
  DELUXE: { guests: 2, bedrooms: 1, bathrooms: 1, sizeSqm: [24, 32], priceMultiplier: 1 },
  PREMIUM: { guests: 2, bedrooms: 1, bathrooms: 1, sizeSqm: [30, 40], priceMultiplier: 1.3 },
  FAMILY: { guests: 4, bedrooms: 2, bathrooms: 2, sizeSqm: [40, 55], priceMultiplier: 1.6 },
  SUITE: { guests: 3, bedrooms: 1, bathrooms: 1, sizeSqm: [45, 60], priceMultiplier: 2 },
  PRESIDENTIAL: { guests: 4, bedrooms: 2, bathrooms: 2, sizeSqm: [70, 100], priceMultiplier: 3.2 },
};

// Nightly rate for a base (Deluxe) room, in INR — realistic Indian hotel pricing.
const CATEGORY_BASE_PRICE: Record<string, [number, number]> = {
  LUXURY_RESORT: [9000, 15000],
  BUSINESS_HOTEL: [2800, 4500],
  VILLA: [5500, 9000],
  BOUTIQUE_HOTEL: [3200, 5500],
  BUDGET_HOTEL: [1200, 2200],
};

const BED_TYPES = ["QUEEN", "KING", "TWIN_BEDS", "DOUBLE"] as const;

export async function seedRooms(hotels: Hotel[], roomsPerHotel: [number, number]): Promise<Room[]> {
  log(`Seeding rooms (${roomsPerHotel[0]}-${roomsPerHotel[1]} per hotel)`);
  const allRooms: Room[] = [];

  for (let hotelIndex = 0; hotelIndex < hotels.length; hotelIndex++) {
    const hotel = hotels[hotelIndex];
    const category = categoryForHotelIndex(hotelIndex);
    const [minBase, maxBase] = CATEGORY_BASE_PRICE[category];
    const basePrice = faker.number.int({ min: minBase, max: maxBase });

    const roomCount = faker.number.int({ min: roomsPerHotel[0], max: roomsPerHotel[1] });
    const typesForHotel = faker.helpers.arrayElements(ROOM_TYPES, Math.min(roomCount, ROOM_TYPES.length));
    // Pad out with repeats (different floors/units) if this hotel needs more rooms than there are types.
    while (typesForHotel.length < roomCount) {
      typesForHotel.push(faker.helpers.arrayElement(ROOM_TYPES));
    }

    for (let i = 0; i < roomCount; i++) {
      const type = typesForHotel[i];
      const tier = ROOM_TYPE_TIER[type];
      const floor = faker.number.int({ min: 1, max: 8 });
      const roomNumber = `${floor}${faker.number.int({ min: 1, max: 20 }).toString().padStart(2, "0")}`;
      const price = Math.round(basePrice * tier.priceMultiplier);
      const hasDiscount = faker.datatype.boolean({ probability: 0.3 });

      const room = await prisma.room.create({
        data: {
          hotelId: hotel.id,
          name: ROOM_TYPE_LABEL[type],
          type,
          description: `A ${ROOM_TYPE_LABEL[type].toLowerCase()} at ${hotel.name}, fitted with modern furnishings and a private bathroom.`,
          pricePerNight: price,
          maxGuests: tier.guests,
          bedrooms: tier.bedrooms,
          bathrooms: tier.bathrooms,
          totalUnits: faker.number.int({ min: 3, max: 9 }),
          sizeSqm: faker.number.int({ min: tier.sizeSqm[0], max: tier.sizeSqm[1] }),
          roomNumber,
          floor,
          bedType: faker.helpers.arrayElement(BED_TYPES),
          discountPercent: hasDiscount ? faker.number.int({ min: 5, max: 25 }) : null,
          isAvailable: faker.datatype.boolean({ probability: 0.95 }),
          images: {
            createMany: {
              data: roomGalleryImages({ roomType: type, seedIndex: hotelIndex * 7 + i * 3 }).map((url, imgIndex) => ({
                url,
                position: imgIndex,
              })),
            },
          },
        },
      });

      allRooms.push(room);
    }
  }

  return allRooms;
}
