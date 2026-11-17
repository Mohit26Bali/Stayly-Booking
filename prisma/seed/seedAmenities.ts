import { prisma, AMENITY_NAMES, log } from "./lib";
import type { Amenity } from "../../src/generated/prisma/client";

export async function seedAmenities(): Promise<Amenity[]> {
  log(`Seeding ${AMENITY_NAMES.length} amenities`);

  const amenities = await Promise.all(
    AMENITY_NAMES.map((name) =>
      prisma.amenity.upsert({ where: { name }, update: {}, create: { name } }),
    ),
  );

  return amenities;
}
