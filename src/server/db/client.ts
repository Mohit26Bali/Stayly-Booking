import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * The PostgreSQL driver adapter ignores Prisma's `?schema=` URL parameter, so it is read here and passed on
 * explicitly. That is what lets the integration tests run in a throwaway schema (and lets you keep the app
 * in a non-default schema if you want to).
 */
function createAdapter() {
  const url = new URL(process.env.DATABASE_URL ?? "postgresql://invalid");
  const schema = url.searchParams.get("schema") ?? undefined;
  url.searchParams.delete("schema");
  return new PrismaPg({ connectionString: url.toString() }, schema ? { schema } : undefined);
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: createAdapter(),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
