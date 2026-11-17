"use client";

import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { Building2, CalendarCheck, DollarSign, LifeBuoy, Loader2, ShieldAlert, Users } from "lucide-react";
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
import { RankedBarChart } from "@/features/dashboard/components/ranked-bar-chart";
import { useAdminDashboard, useSetHotelStatus } from "@/features/dashboard/hooks/use-admin-dashboard";
import { formatINR } from "@/lib/format";

const formatCurrency = formatINR;
const formatCount = (value: number) => value.toLocaleString();

export default function AdminDashboardPage() {
  const { data, isLoading } = useAdminDashboard();
  const setHotelStatus = useSetHotelStatus();

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
        <h1 className="text-2xl font-bold tracking-tight">Admin dashboard</h1>
        <Button variant="outline" render={<Link href="/dashboard/admin/tickets" />}>
          <LifeBuoy className="size-4" />
          Support tickets
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Users" value={data.stats.totalUsers} icon={Users} />
        <StatCard label="Hotels" value={data.stats.totalHotels} icon={Building2} />
        <StatCard label="Bookings" value={data.stats.totalBookings} icon={CalendarCheck} />
        <StatCard
          label="Revenue"
          value={formatINR(data.stats.totalRevenue)}
          icon={DollarSign}
        />
        <StatCard label="Pending approvals" value={data.stats.pendingApprovals} icon={ShieldAlert} />
      </div>

      <section className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Revenue" subtitle="Confirmed & completed bookings, last 6 months">
          <TrendChart data={data.charts.revenueTrend} formatValue={formatCurrency} />
        </ChartCard>
        <ChartCard title="Booking trend" subtitle="Bookings made, last 6 months">
          <TrendChart
            data={data.charts.bookingTrend}
            color="var(--chart-3)"
            formatValue={formatCount}
          />
        </ChartCard>
        <ChartCard title="Top performing hotels" subtitle="By revenue, all-time">
          <RankedBarChart
            data={data.charts.topHotels.map((h) => ({ name: h.name, value: h.revenue }))}
            formatValue={formatCurrency}
            color="var(--chart-2)"
          />
        </ChartCard>
        <ChartCard title="Customer growth" subtitle="Cumulative signups, last 6 months">
          <TrendChart
            data={data.charts.customerGrowth}
            color="var(--chart-7)"
            formatValue={formatCount}
          />
        </ChartCard>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Pending hotel approvals</h2>
        {data.pendingHotels.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nothing waiting on review.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hotel</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.pendingHotels.map((hotel) => (
                  <TableRow key={hotel.id}>
                    <TableCell className="font-medium">{hotel.name}</TableCell>
                    <TableCell>{hotel.owner.email}</TableCell>
                    <TableCell>
                      {hotel.city}, {hotel.country}
                    </TableCell>
                    <TableCell>{format(new Date(hotel.createdAt), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={setHotelStatus.isPending}
                          onClick={() =>
                            setHotelStatus.mutate(
                              { id: hotel.id, status: "REJECTED" },
                              { onSuccess: () => toast.success(`${hotel.name} rejected`) },
                            )
                          }
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          disabled={setHotelStatus.isPending}
                          onClick={() =>
                            setHotelStatus.mutate(
                              { id: hotel.id, status: "APPROVED" },
                              { onSuccess: () => toast.success(`${hotel.name} approved`) },
                            )
                          }
                        >
                          Approve
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold">Recent users</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{u.role}</Badge>
                    </TableCell>
                    <TableCell>{format(new Date(u.createdAt), "MMM d, yyyy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Recent hotels</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hotel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentHotels.map((hotel) => (
                  <TableRow key={hotel.id}>
                    <TableCell>{hotel.name}</TableCell>
                    <TableCell>
                      <Badge variant={hotel.status === "APPROVED" ? "default" : "secondary"}>
                        {hotel.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {hotel.city}, {hotel.country}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </div>
  );
}
