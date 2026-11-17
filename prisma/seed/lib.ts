import "dotenv/config";
import { Faker, en } from "@faker-js/faker";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });

/** Fixed seed so every run of a given seed tier produces identical demo content. */
export const faker = new Faker({ locale: [en] });
faker.seed(20260730);

export function log(step: string, detail?: string) {
  console.log(`  ${step}${detail ? ` — ${detail}` : ""}`);
}

export function section(title: string) {
  console.log(`\n${title}`);
}

// ---------------------------------------------------------------------------
// Cities
// ---------------------------------------------------------------------------

export interface CityInfo {
  city: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
}

export const CITIES: CityInfo[] = [
  { city: "Jaipur", state: "Rajasthan", country: "India", lat: 26.9124, lng: 75.7873 },
  { city: "Udaipur", state: "Rajasthan", country: "India", lat: 24.5854, lng: 73.7125 },
  { city: "Goa", state: "Goa", country: "India", lat: 15.2993, lng: 74.124 },
  { city: "Mumbai", state: "Maharashtra", country: "India", lat: 19.076, lng: 72.8777 },
  { city: "Bengaluru", state: "Karnataka", country: "India", lat: 12.9716, lng: 77.5946 },
  { city: "Delhi", state: "Delhi", country: "India", lat: 28.6139, lng: 77.209 },
  { city: "Manali", state: "Himachal Pradesh", country: "India", lat: 32.2432, lng: 77.1892 },
];

// ---------------------------------------------------------------------------
// Amenities
// ---------------------------------------------------------------------------

export const AMENITY_NAMES = [
  "Free WiFi",
  "Swimming Pool",
  "Gym",
  "Spa",
  "Restaurant",
  "Parking",
  "Breakfast Included",
  "Room Service",
  "Air Conditioning",
  "Laundry",
  "Airport Shuttle",
  "Pet Friendly",
  "Balcony",
  "Sea View",
  "Mountain View",
  "Workspace",
  "Elevator",
  "EV Charging",
  "Conference Room",
  "Kids Play Area",
];

// ---------------------------------------------------------------------------
// Small generic helpers
// ---------------------------------------------------------------------------

export function pick<T>(arr: readonly T[]): T {
  return faker.helpers.arrayElement(arr);
}

export function pickMany<T>(arr: readonly T[], count: number): T[] {
  return faker.helpers.arrayElements(arr, count);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

let refCounter = 0;
export function nextBookingRef(tierTag: string): string {
  refCounter += 1;
  return `STY-${tierTag.toUpperCase()}${String(refCounter).padStart(5, "0")}`;
}

let invoiceCounter = 0;
export function nextInvoiceNumber(tierTag: string): string {
  invoiceCounter += 1;
  return `INV-${tierTag.toUpperCase()}-${new Date().getFullYear()}-${String(invoiceCounter).padStart(6, "0")}`;
}
