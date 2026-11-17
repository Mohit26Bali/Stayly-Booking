import { prisma } from "@/server/db/client";
import { publicUserSelect } from "@/server/db/selects";
import {
  ownerRevenueTrend,
  ownerBookingsByStatus,
  ownerPopularRooms,
  adminRevenueTrend,
  adminBookingTrend,
  adminCustomerGrowth,
  adminTopHotels,
} from "@/server/dashboard/charts";

function sumTotalAmount(bookings: { totalAmount: unknown }[]): number {
  return bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
}

export async function getOwnerDashboard(ownerId: string) {
  const hotels = await prisma.hotel.findMany({
    where: { ownerId },
    include: {
      images: { take: 1, orderBy: { position: "asc" } },
      _count: { select: { rooms: true, bookings: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const hotelIds = hotels.map((h) => h.id);

  const bookings = await prisma.booking.findMany({
    where: { hotelId: { in: hotelIds } },
    include: { hotel: true, room: true, user: { select: publicUserSelect } },
    orderBy: { createdAt: "desc" },
  });

  const confirmedOrCompleted = bookings.filter((b) => b.status === "CONFIRMED" || b.status === "COMPLETED");
  const startOfToday = new Date(new Date().toDateString());
  const todaysBookings = bookings.filter((b) => b.createdAt >= startOfToday);

  const reviews = await prisma.review.findMany({
    where: { hotelId: { in: hotelIds } },
    include: { user: { select: publicUserSelect }, hotel: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const [revenueTrend, bookingsByStatus, popularRooms] = await Promise.all([
    ownerRevenueTrend(ownerId),
    ownerBookingsByStatus(ownerId),
    ownerPopularRooms(ownerId),
  ]);

  return {
    stats: {
      totalHotels: hotels.length,
      totalBookings: bookings.length,
      totalRevenue: sumTotalAmount(confirmedOrCompleted),
      todaysBookings: todaysBookings.length,
    },
    hotels: hotels.map((h) => ({
      id: h.id,
      name: h.name,
      slug: h.slug,
      city: h.city,
      country: h.country,
      status: h.status,
      avgRating: h.avgRating,
      roomCount: h._count.rooms,
      bookingCount: h._count.bookings,
      image: h.images[0]?.url ?? null,
    })),
    recentBookings: bookings.slice(0, 10),
    reviews,
    charts: { revenueTrend, bookingsByStatus, popularRooms },
  };
}

export async function getAdminDashboard() {
  const [totalUsers, totalHotels, totalBookings, bookings, recentUsers, recentHotels, pendingHotels] =
    await Promise.all([
      prisma.user.count(),
      prisma.hotel.count(),
      prisma.booking.count(),
      prisma.booking.findMany({
        where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
        select: { totalAmount: true },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: publicUserSelect,
      }),
      prisma.hotel.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { owner: { select: publicUserSelect } },
      }),
      prisma.hotel.findMany({
        where: { status: "PENDING" },
        include: { owner: { select: publicUserSelect } },
        orderBy: { createdAt: "asc" },
      }),
    ]);

  const [revenueTrend, bookingTrend, customerGrowth, topHotels] = await Promise.all([
    adminRevenueTrend(),
    adminBookingTrend(),
    adminCustomerGrowth(),
    adminTopHotels(),
  ]);

  return {
    stats: {
      totalUsers,
      totalHotels,
      totalBookings,
      totalRevenue: sumTotalAmount(bookings),
      pendingApprovals: pendingHotels.length,
    },
    recentUsers,
    recentHotels,
    pendingHotels,
    charts: { revenueTrend, bookingTrend, customerGrowth, topHotels },
  };
}

export async function setHotelStatus(hotelId: string, status: "APPROVED" | "REJECTED" | "SUSPENDED") {
  return prisma.hotel.update({ where: { id: hotelId }, data: { status } });
}
