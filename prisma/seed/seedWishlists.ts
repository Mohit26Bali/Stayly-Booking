import { prisma, faker, log } from "./lib";
import type { Hotel, User, Wishlist } from "../../src/generated/prisma/client";

export async function seedWishlists(customers: User[], hotels: Hotel[]): Promise<Wishlist[]> {
  log(`Seeding wishlists (2-3 hotels per customer)`);
  const wishlists: Wishlist[] = [];

  for (const customer of customers) {
    const count = faker.number.int({ min: 2, max: 3 });
    const picks = faker.helpers.arrayElements(hotels, Math.min(count, hotels.length));

    for (const hotel of picks) {
      const wishlist = await prisma.wishlist.upsert({
        where: { userId_hotelId: { userId: customer.id, hotelId: hotel.id } },
        update: {},
        create: { userId: customer.id, hotelId: hotel.id },
      });
      wishlists.push(wishlist);
    }
  }

  return wishlists;
}
