import { z } from "zod";

export const propertyTypeEnum = z.enum([
  "HOTEL",
  "APARTMENT",
  "RESORT",
  "VILLA",
  "HOSTEL",
  "GUEST_HOUSE",
  "COTTAGE",
]);

export const roomTypeEnum = z.enum([
  "SINGLE",
  "DOUBLE",
  "TWIN",
  "DELUXE",
  "PREMIUM",
  "SUITE",
  "FAMILY",
  "PRESIDENTIAL",
  "DORMITORY",
]);

export const hotelSearchSchema = z.object({
  q: z.string().trim().optional(),
  city: z.string().trim().optional(),
  checkIn: z.iso.date().optional(),
  checkOut: z.iso.date().optional(),
  guests: z.coerce.number().int().min(1).max(20).optional(),
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  propertyType: propertyTypeEnum.optional(),
  roomType: roomTypeEnum.optional(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().int().min(0).optional(),
  amenities: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (Array.isArray(v) ? v : v ? [v] : [])),
  breakfastIncluded: z.coerce.boolean().optional(),
  petFriendly: z.coerce.boolean().optional(),
  sort: z
    .enum(["price_asc", "price_desc", "newest", "rating", "popular"])
    .default("popular"),
  view: z.enum(["grid", "list", "map"]).default("grid"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});
export type HotelSearchInput = z.infer<typeof hotelSearchSchema>;

export const createHotelSchema = z.object({
  name: z.string().min(3).max(120),
  description: z.string().min(20).max(5000),
  propertyType: propertyTypeEnum.default("HOTEL"),
  addressLine: z.string().min(3),
  city: z.string().min(1),
  state: z.string().optional(),
  country: z.string().min(1),
  postalCode: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  checkInTime: z.string().default("14:00"),
  checkOutTime: z.string().default("11:00"),
  breakfastIncluded: z.boolean().default(false),
  petFriendly: z.boolean().default(false),
  hasParking: z.boolean().default(false),
  hasWifi: z.boolean().default(true),
  hasPool: z.boolean().default(false),
  hasGym: z.boolean().default(false),
  hasSpa: z.boolean().default(false),
  hasRestaurant: z.boolean().default(false),
  accessibility: z.boolean().default(false),
  cancellationPolicy: z.string().optional(),
  houseRules: z.string().optional(),
  amenityIds: z.array(z.string()).default([]),
});
export type CreateHotelInput = z.infer<typeof createHotelSchema>;

export const updateHotelSchema = createHotelSchema.partial();
export type UpdateHotelInput = z.infer<typeof updateHotelSchema>;

export const createRoomSchema = z.object({
  name: z.string().min(2).max(120),
  type: roomTypeEnum.default("DOUBLE"),
  description: z.string().max(2000).optional(),
  pricePerNight: z.number().positive(),
  maxGuests: z.number().int().min(1).max(20),
  bedrooms: z.number().int().min(0).max(10),
  bathrooms: z.number().int().min(0).max(10),
  totalUnits: z.number().int().min(1).max(500),
  sizeSqm: z.number().positive().optional(),
});
export type CreateRoomInput = z.infer<typeof createRoomSchema>;

// `isAvailable: false` takes a room off the market (no new bookings) without deleting its booking history.
export const updateRoomSchema = createRoomSchema.partial().extend({ isAvailable: z.boolean().optional() });
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
