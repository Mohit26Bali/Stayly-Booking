// Creates a throwaway PostgreSQL SCHEMA for integration tests and drops it afterwards.
//
// A schema (not a database) is used because the project's database role normally cannot CREATE DATABASE but
// can create schemas. `booking_test_<random>` is completely isolated from the real data in `public`; the
// migrations are applied to it, DATABASE_URL is pointed at it, and it is dropped (CASCADE) at the end.
// The harness refuses to continue unless DATABASE_URL really points at a `booking_test_*` schema.
import { execFileSync } from "node:child_process";
import path from "node:path";
import pg from "pg";

// ---- Environment for tests (runs on import, before any application module is loaded) ----
try {
  process.loadEnvFile(".env"); // finds the PostgreSQL server; existing variables are not overridden
} catch {
  // no .env (e.g. CI): everything needed comes from the environment
}
// .env says NODE_ENV=development; tests must run in "test" mode.
(process.env as Record<string, string | undefined>).NODE_ENV = "test";
// Tests must never reach real payment providers or send real e-mail, whatever .env contains.
for (const key of ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "NEXT_PUBLIC_RAZORPAY_KEY_ID", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "RESEND_API_KEY"]) {
  process.env[key] = "";
}

export interface TestDatabase {
  schema: string;
  url: string;
  drop: () => Promise<void>;
}

export async function createTestDatabase(): Promise<TestDatabase | null> {
  const base = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!base) return null;

  const schema = `booking_test_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
  const admin = new pg.Client({ connectionString: new URL(base).toString().replace(/[?&]schema=[^&]*/, "") });

  try {
    await admin.connect();
    await admin.query(`CREATE SCHEMA "${schema}"`);
  } catch {
    await admin.end().catch(() => undefined);
    return null; // server unreachable / no permission -> integration tests are skipped
  }

  const testUrl = new URL(base);
  testUrl.searchParams.set("schema", schema);
  const url = testUrl.toString();

  try {
    execFileSync(process.execPath, [path.resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: url },
      stdio: "pipe",
      cwd: process.cwd(),
    });
  } catch (error) {
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => undefined);
    await admin.end().catch(() => undefined);
    throw error;
  }

  process.env.DATABASE_URL = url;
  if (!new URL(process.env.DATABASE_URL).searchParams.get("schema")?.startsWith("booking_test_")) {
    throw new Error("Refusing to run integration tests: DATABASE_URL is not a throwaway schema.");
  }

  return {
    schema,
    url,
    async drop() {
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.end();
    },
  };
}
