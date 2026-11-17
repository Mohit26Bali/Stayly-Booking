import { prisma, log } from "./lib";

/**
 * Deletes previously-seeded demo/minimal content so re-running a seed tier is
 * idempotent. Deliberately narrow: only removes data owned by seed-created
 * accounts (emails ending in the seed's domain), never arbitrary user data.
 */
export async function clearSeedData(emailDomain: string) {
  const users = await prisma.user.findMany({
    where: { email: { endsWith: emailDomain } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);

  if (userIds.length === 0) return;

  // Cascading deletes on User handle almost everything (sessions, bookings,
  // reviews, wishlists, hotels owned, etc.) — see prisma/schema.prisma.
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  log(`Cleared ${userIds.length} previously-seeded users and their data`);
}
