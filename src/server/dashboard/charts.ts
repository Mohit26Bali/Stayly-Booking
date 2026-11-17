import { prisma } from "@/server/db/client";

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "short" });
}

function trailingMonthKeys(months: number, now: Date): string[] {
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(monthKey(d));
  }
  return keys;
}

export interface MonthlyPoint {
  month: string;
  label: string;
  value: number;
}

function bucketMonthly(
  rows: { createdAt: Date; amount?: number }[],
  months: number,
  mode: "sum" | "count",
): MonthlyPoint[] {
  const now = new Date();
  const keys = trailingMonthKeys(months, now);
  const totals = new Map<string, number>(keys.map((k) => [k, 0]));

  for (const row of rows) {
    const key = monthKey(row.createdAt);
    if (!totals.has(key)) continue;
    const current = totals.get(key) ?? 0;
    totals.set(key, mode === "sum" ? current + (row.amount ?? 0) : current + 1);
  }

  return keys.map((key) => ({
    month: key,
    label: monthLabel(key),
    value: Math.round((totals.get(key) ?? 0) * 100) / 100,
  }));
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
  EXPIRED: "Expired",
};

export async function ownerRevenueTrend(ownerId: string, months = 6): Promise<MonthlyPoint[]> {
  const bookings = await prisma.booking.findMany({
    where: { hotel: { ownerId }, status: { in: ["CONFIRMED", "COMPLETED"] } },
    select: { createdAt: true, totalAmount: true },
  });

  return bucketMonthly(
    bookings.map((b) => ({ createdAt: b.createdAt, amount: Number(b.totalAmount) })),
    months,
    "sum",
  );
}

export async function ownerBookingsByStatus(ownerId: string) {
  const grouped = await prisma.booking.groupBy({
    by: ["status"],
    where: { hotel: { ownerId } },
    _count: true,
  });

  return grouped
    .map((g) => ({ status: g.status, label: STATUS_LABEL[g.status] ?? g.status, count: g._count }))
    .sort((a, b) => b.count - a.count);
}

export async function ownerPopularRooms(ownerId: string, limit = 5) {
  const grouped = await prisma.booking.groupBy({
    by: ["roomId"],
    where: { hotel: { ownerId } },
    _count: true,
    orderBy: { _count: { roomId: "desc" } },
    take: limit,
  });

  const rooms = await prisma.room.findMany({
    where: { id: { in: grouped.map((g) => g.roomId) } },
    include: { hotel: { select: { name: true } } },
  });
  const roomById = new Map(rooms.map((r) => [r.id, r]));

  return grouped
    .map((g) => {
      const room = roomById.get(g.roomId);
      return {
        roomId: g.roomId,
        name: room ? `${room.name} · ${room.hotel.name}` : "Unknown room",
        bookings: g._count,
      };
    })
    .filter((r) => r.name !== "Unknown room");
}

export async function adminRevenueTrend(months = 6): Promise<MonthlyPoint[]> {
  const bookings = await prisma.booking.findMany({
    where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
    select: { createdAt: true, totalAmount: true },
  });

  return bucketMonthly(
    bookings.map((b) => ({ createdAt: b.createdAt, amount: Number(b.totalAmount) })),
    months,
    "sum",
  );
}

export async function adminBookingTrend(months = 6): Promise<MonthlyPoint[]> {
  const bookings = await prisma.booking.findMany({ select: { createdAt: true } });
  return bucketMonthly(bookings, months, "count");
}

export async function adminCustomerGrowth(months = 6): Promise<MonthlyPoint[]> {
  const users = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: { createdAt: true },
  });

  const perMonth = bucketMonthly(users, months, "count");

  let running = 0;
  const cumulative = perMonth.map((point) => {
    running += point.value;
    return { ...point, value: running };
  });

  return cumulative;
}

export async function adminTopHotels(limit = 5) {
  const hotels = await prisma.hotel.findMany({
    select: {
      id: true,
      name: true,
      bookings: {
        where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
        select: { totalAmount: true },
      },
    },
  });

  return hotels
    .map((h) => ({
      hotelId: h.id,
      name: h.name,
      revenue: Math.round(h.bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0) * 100) / 100,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}
