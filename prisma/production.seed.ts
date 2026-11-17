import { prisma, section } from "./seed/lib";
import { seedAmenities } from "./seed/seedAmenities";
import { hashPassword } from "../src/server/auth/password";

/**
 * Production bootstrap seed. Creates only what a fresh production database
 * needs to be usable — the real admin account and the shared amenity
 * catalog. No fake hotels, bookings, or customers.
 */
async function main() {
  section("Admin account");
  const passwordHash = await hashPassword("Admin@123");
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      passwordHash,
      role: "ADMIN",
      emailVerified: true,
      profile: { create: { firstName: "Site", lastName: "Admin" } },
    },
  });

  section("Amenity catalog");
  const amenities = await seedAmenities();

  section("Done");
  console.log(`  Admin: ${admin.email} / Admin@123 (change this password immediately)`);
  console.log(`  Amenities: ${amenities.length}`);
  console.log("\nNo demo hotels, bookings, or customers were created.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
