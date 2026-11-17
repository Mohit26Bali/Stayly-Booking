import { prisma, section } from "./seed/lib";
import { clearSeedData } from "./seed/reset";
import { seedAmenities } from "./seed/seedAmenities";
import { seedUsers } from "./seed/seedUsers";
import { seedHotels } from "./seed/seedHotels";
import { seedRooms } from "./seed/seedRooms";
import { seedBookings } from "./seed/seedBookings";
import { seedPayments } from "./seed/seedPayments";
import { seedReviews } from "./seed/seedReviews";
import { seedWishlists } from "./seed/seedWishlists";
import { seedCoupons } from "./seed/seedCoupons";
import { seedNotifications } from "./seed/seedNotifications";
import { seedMessages } from "./seed/seedMessages";

const EMAIL_DOMAIN = "demo.stayly.dev";

async function main() {
  const startedAt = Date.now();

  section("Resetting previous demo data");
  await clearSeedData(EMAIL_DOMAIN);

  section("Users");
  const { admin, owners, customers } = await seedUsers({
    ownerCount: 5,
    customerCount: 30,
    emailDomain: EMAIL_DOMAIN,
  });

  section("Catalog");
  const amenities = await seedAmenities();
  const coupons = await seedCoupons();

  section("Hotels & rooms");
  const { hotels } = await seedHotels(owners, amenities, 15, "demo");
  const rooms = await seedRooms(hotels, [5, 6]);

  section("Bookings & payments");
  const { bookings, reviewEligible } = await seedBookings(customers, rooms, "demo");
  const payments = await seedPayments(bookings, "demo");

  section("Reviews & wishlists");
  const reviews = await seedReviews(reviewEligible, 90);
  const wishlists = await seedWishlists(customers, hotels);

  section("Notifications & messages");
  const hotelNameById = new Map(hotels.map((h) => [h.id, h.name]));
  const notifications = await seedNotifications(customers, bookings, hotelNameById, 100);
  const { conversationCount, messages } = await seedMessages(customers, hotels, 25, 180);

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);

  section("Done");
  console.log(`  Admin:          ${admin.email} / Admin@123`);
  console.log(`  Owners:         ${owners.length} (password: Owner@123)`);
  console.log(`  Customers:      ${customers.length} (password: Customer@123)`);
  console.log(`  Amenities:      ${amenities.length}`);
  console.log(`  Coupons:        ${coupons.length}`);
  console.log(`  Hotels:         ${hotels.length}`);
  console.log(`  Rooms:          ${rooms.length}`);
  console.log(`  Bookings:       ${bookings.length}`);
  console.log(`  Payments:       ${payments.length}`);
  console.log(`  Reviews:        ${reviews.length}`);
  console.log(`  Wishlist items: ${wishlists.length}`);
  console.log(`  Notifications:  ${notifications.length}`);
  console.log(`  Conversations:  ${conversationCount}`);
  console.log(`  Messages:       ${messages.length}`);
  console.log(`\nSeeded in ${seconds}s`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
