"use client";

import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { Building2, CalendarCheck, DollarSign, Loader2, Plus, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { ChartCard } from "@/features/dashboard/components/chart-card";
import { TrendChart } from "@/features/dashboard/components/trend-chart";
import { StatusBarChart } from "@/features/dashboard/components/status-bar-chart";
import { RankedBarChart } from "@/features/dashboard/components/ranked-bar-chart";
import { useOwnerDashboard } from "@/features/dashboard/hooks/use-owner-dashboard";
import { OwnerReviewItem } from "@/features/reviews/components/owner-review-item";
import { formatINR } from "@/lib/format";

const formatCurrency = formatINR;

export default function OwnerDashboardPage() {
  const { data, isLoading } = useOwnerDashboard();

  if (isLoading || !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Hotel owner dashboard</h1>
        <Button render={<Link href="/dashboard/owner/hotels/new" />}>
          <Plus className="size-4" />
          Add hotel
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Hotels" value={data.stats.totalHotels} icon={Building2} />
        <StatCard label="Total bookings" value={data.stats.totalBookings} icon={CalendarCheck} />
        <StatCard label="Today's bookings" value={data.stats.todaysBookings} icon={CalendarCheck} />
        <StatCard
          label="Revenue"
          value={formatINR(data.stats.totalRevenue)}
          icon={DollarSign}
        />
      </div>

      <section className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="Revenue" subtitle="Confirmed & completed bookings, last 6 months">
            <TrendChart data={data.charts.revenueTrend} formatValue={formatCurrency} />
          </ChartCard>
        </div>
        <ChartCard title="Bookings by status" subtitle="All-time">
          <StatusBarChart
            data={data.charts.bookingsByStatus.map((s) => ({
              status: s.status,
              label: s.label,
              count: s.count,
            }))}
          />
        </ChartCard>
        <div className="lg:col-span-3">
          <ChartCard title="Popular rooms" subtitle="Most booked, all-time">
            <RankedBarChart
              data={data.charts.popularRooms.map((r) => ({ name: r.name, value: r.bookings }))}
            />
          </ChartCard>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Your hotels</h2>
        {data.hotels.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            You haven&apos;t listed any hotels yet.{" "}
            <Link href="/dashboard/owner/hotels/new" className="font-medium text-primary hover:underline">
              Add your first hotel
            </Link>
            .
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.hotels.map((hotel) => (
              <div key={hotel.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="relative aspect-video bg-muted">
                  {hotel.image && (
                    <Image src={hotel.image} alt={hotel.name} fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover" />
                  )}
                  <Badge className="absolute left-2 top-2" variant={hotel.status === "APPROVED" ? "default" : "secondary"}>
                    {hotel.status}
                  </Badge>
                </div>
                <div className="p-4">
                  {hotel.status === "APPROVED" ? (
                    <Link href={`/hotels/${hotel.slug}`} className="font-semibold hover:text-primary">
                      {hotel.name}
                    </Link>
                  ) : (
                    <span className="font-semibold">{hotel.name}</span>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {hotel.city}, {hotel.country}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Star className="size-3.5 fill-current text-accent" />
                      {hotel.avgRating.toFixed(1)}
                    </span>
                    <span className="text-muted-foreground">
                      {hotel.roomCount} rooms · {hotel.bookingCount} bookings
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    render={<Link href={`/dashboard/owner/hotels/${hotel.id}/rooms`} />}
                  >
                    Manage rooms
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Recent bookings</h2>
        {data.recentBookings.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No bookings yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Hotel</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      {booking.user.profile?.firstName ?? booking.user.email}
                    </TableCell>
                    <TableCell>{booking.hotel.name}</TableCell>
                    <TableCell>{booking.room.name}</TableCell>
                    <TableCell>
                      {format(new Date(booking.checkIn), "MMM d")} –{" "}
                      {format(new Date(booking.checkOut), "MMM d")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={booking.status === "CONFIRMED" ? "default" : "secondary"}>
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatINR(booking.totalAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Reviews</h2>
        {data.reviews.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No reviews yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {data.reviews.map((review) => (
              <OwnerReviewItem key={review.id} review={review} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
