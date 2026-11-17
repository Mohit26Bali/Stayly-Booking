import { prisma } from "@/server/db/client";
import { AuthError } from "@/server/auth/service";
import type { Prisma } from "@/generated/prisma/client";
import type { HotelSearchInput, CreateHotelInput, UpdateHotelInput, CreateRoomInput, UpdateRoomInput } from "@/features/hotels/schemas/hotel.schema";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let counter = 1;
  while (await prisma.hotel.findUnique({ where: { slug } })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
}

const hotelCardInclude = {
  images: { orderBy: { position: "asc" as const }, take: 1 },
  rooms: { select: { pricePerNight: true, maxGuests: true, bedrooms: true, bathrooms: true, type: true } },
} satisfies Prisma.HotelInclude;

export async function searchHotels(filters: HotelSearchInput) {
  const where: Prisma.HotelWhereInput = {
    status: "APPROVED",
  };

  if (filters.city) {
    where.city = { contains: filters.city, mode: "insensitive" };
  }
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { city: { contains: filters.q, mode: "insensitive" } },
      { country: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  if (filters.propertyType) {
    where.propertyType = filters.propertyType;
  }
  if (filters.rating) {
    where.avgRating = { gte: filters.rating };
  }
  if (filters.breakfastIncluded) {
    where.breakfastIncluded = true;
  }
  if (filters.petFriendly) {
    where.petFriendly = true;
  }
  if (filters.amenities.length > 0) {
    where.amenities = { some: { amenity: { name: { in: filters.amenities } } } };
  }

  const roomFilters: Prisma.RoomWhereInput = {};
  if (filters.guests) roomFilters.maxGuests = { gte: filters.guests };
  if (filters.roomType) roomFilters.type = filters.roomType;
  if (filters.bedrooms !== undefined) roomFilters.bedrooms = { gte: filters.bedrooms };
  if (filters.bathrooms !== undefined) roomFilters.bathrooms = { gte: filters.bathrooms };
  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    roomFilters.pricePerNight = {
      ...(filters.priceMin !== undefined ? { gte: filters.priceMin } : {}),
      ...(filters.priceMax !== undefined ? { lte: filters.priceMax } : {}),
    };
  }
  if (Object.keys(roomFilters).length > 0) {
    where.rooms = { some: roomFilters };
  }

  const hotels = await prisma.hotel.findMany({
    where,
    include: hotelCardInclude,
    orderBy: filters.sort === "newest" ? { createdAt: "desc" } : undefined,
  });

  const withPricing = hotels
    .map((hotel) => {
      const prices = hotel.rooms.map((r) => Number(r.pricePerNight));
      const lowestPrice = prices.length > 0 ? Math.min(...prices) : null;
      return { ...hotel, lowestPrice };
    })
    .filter((hotel) => hotel.lowestPrice !== null);

  const sorted = [...withPricing].sort((a, b) => {
    switch (filters.sort) {
      case "price_asc":
        return (a.lowestPrice ?? 0) - (b.lowestPrice ?? 0);
      case "price_desc":
        return (b.lowestPrice ?? 0) - (a.lowestPrice ?? 0);
      case "rating":
        return b.avgRating - a.avgRating;
      case "popular":
        return b.reviewCount - a.reviewCount;
      default:
        return 0;
    }
  });

  const total = sorted.length;
  const start = (filters.page - 1) * filters.pageSize;
  const page = sorted.slice(start, start + filters.pageSize);

  return {
    items: page.map(({ rooms: _rooms, ...hotel }) => hotel),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
  };
}

export async function getPopularDestinations() {
  const rows = await prisma.hotel.groupBy({
    by: ["city"],
    where: { status: "APPROVED" },
    _count: { _all: true },
    orderBy: { _count: { city: "desc" } },
  });

  return rows.map((row) => ({ city: row.city, count: row._count._all }));
}

export async function getHotelBySlug(slug: string) {
  return prisma.hotel.findFirst({
    where: { slug, status: "APPROVED" },
    include: {
      images: { orderBy: { position: "asc" } },
      rooms: { include: { images: { orderBy: { position: "asc" } } } },
      amenities: { include: { amenity: true } },
      nearbyAttractions: true,
      reviews: {
        include: {
          user: { select: { id: true, profile: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      owner: { select: { id: true, profile: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
    },
  });
}

export async function listAmenities() {
  return prisma.amenity.findMany({ orderBy: { name: "asc" } });
}

interface OwnershipActor {
  id: string;
  role: string;
}

async function assertHotelOwnership(hotelId: string, actor: OwnershipActor) {
  const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
  if (!hotel) throw new AuthError("Hotel not found", 404);
  if (hotel.ownerId !== actor.id && actor.role !== "ADMIN") {
    throw new AuthError("You don't own this hotel", 403);
  }
  return hotel;
}

export async function createHotel(ownerId: string, input: CreateHotelInput) {
  const slug = await uniqueSlug(input.name);
  const { amenityIds, ...rest } = input;

  return prisma.hotel.create({
    data: {
      ...rest,
      slug,
      ownerId,
      amenities: { createMany: { data: amenityIds.map((amenityId) => ({ amenityId })) } },
    },
  });
}

export async function updateHotel(hotelId: string, actor: OwnershipActor, input: UpdateHotelInput) {
  await assertHotelOwnership(hotelId, actor);
  const { amenityIds, ...rest } = input;

  return prisma.hotel.update({
    where: { id: hotelId },
    data: {
      ...rest,
      ...(amenityIds
        ? {
            amenities: {
              deleteMany: {},
              createMany: { data: amenityIds.map((amenityId) => ({ amenityId })) },
            },
          }
        : {}),
    },
  });
}

export async function deleteHotel(hotelId: string, actor: OwnershipActor) {
  await assertHotelOwnership(hotelId, actor);
  // Guests' bookings and payments are financial records: they must never vanish because a listing was removed.
  const bookings = await prisma.booking.count({ where: { hotelId } });
  if (bookings > 0) {
    throw new AuthError(
      "This property has bookings, so it can't be deleted. Ask an administrator to suspend it instead.",
      409,
    );
  }
  await prisma.hotel.delete({ where: { id: hotelId } });
}

/** Highest number of units of one room needed on any single night by upcoming bookings. */
async function peakUpcomingUnits(roomId: string): Promise<number> {
  const today = new Date(new Date().toISOString().slice(0, 10));
  const upcoming = await prisma.booking.findMany({
    where: {
      roomId,
      checkOut: { gt: today },
      OR: [{ status: "CONFIRMED" }, { status: "PENDING", createdAt: { gt: new Date(Date.now() - 24 * 3_600_000) } }],
    },
    select: { checkIn: true, checkOut: true, unitsBooked: true },
  });
  let peak = 0;
  for (const day of upcoming) {
    const load = upcoming
      .filter((b) => b.checkIn <= day.checkIn && b.checkOut > day.checkIn)
      .reduce((sum, b) => sum + b.unitsBooked, 0);
    peak = Math.max(peak, load);
  }
  return peak;
}

export async function createRoom(hotelId: string, actor: OwnershipActor, input: CreateRoomInput) {
  await assertHotelOwnership(hotelId, actor);
  return prisma.room.create({ data: { ...input, hotelId } });
}

export async function updateRoom(
  hotelId: string,
  roomId: string,
  actor: OwnershipActor,
  input: UpdateRoomInput,
) {
  await assertHotelOwnership(hotelId, actor);
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room || room.hotelId !== hotelId) throw new AuthError("Room not found", 404);

  if (input.totalUnits !== undefined && input.totalUnits < room.totalUnits) {
    const peak = await peakUpcomingUnits(roomId);
    if (input.totalUnits < peak) {
      throw new AuthError(
        `Upcoming bookings need ${peak} unit${peak === 1 ? "" : "s"} of this room, so it can't be reduced below that.`,
        409,
      );
    }
  }

  return prisma.room.update({ where: { id: roomId }, data: input });
}

export async function deleteRoom(hotelId: string, roomId: string, actor: OwnershipActor) {
  await assertHotelOwnership(hotelId, actor);
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room || room.hotelId !== hotelId) throw new AuthError("Room not found", 404);

  if ((await prisma.booking.count({ where: { roomId } })) > 0) {
    throw new AuthError(
      "This room has bookings, so it can't be deleted. Mark it as unavailable instead to stop new bookings.",
      409,
    );
  }
  await prisma.room.delete({ where: { id: roomId } });
}
