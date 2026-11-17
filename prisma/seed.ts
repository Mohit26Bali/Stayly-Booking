/**
 * Default entrypoint for `prisma db seed`. Picks a seed tier via SEED_MODE
 * (minimal | demo | production), defaulting to "demo" for local development.
 * Prefer the explicit npm scripts (`npm run seed:minimal` etc.) day-to-day —
 * this dispatcher exists so `prisma db seed` / `prisma migrate reset` keep working.
 */
const mode = (process.env.SEED_MODE ?? "demo").toLowerCase();

async function run() {
  switch (mode) {
    case "minimal":
      await import("./minimal.seed");
      break;
    case "production":
      await import("./production.seed");
      break;
    case "demo":
      await import("./demo.seed");
      break;
    default:
      throw new Error(`Unknown SEED_MODE "${mode}". Use minimal, demo, or production.`);
  }
}

run();
