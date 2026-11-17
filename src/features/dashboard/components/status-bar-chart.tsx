"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChartTooltip } from "@/features/dashboard/components/chart-tooltip";

export interface StatusBarDatum {
  status: string;
  label: string;
  count: number;
}

const STATUS_COLOR: Record<string, string> = {
  CONFIRMED: "var(--status-good)",
  COMPLETED: "var(--status-good)",
  PENDING: "var(--status-warning)",
  REFUNDED: "var(--chart-1)",
  CANCELLED: "var(--status-serious)",
  EXPIRED: "var(--status-critical)",
};

export function StatusBarChart({ data, height = 220 }: { data: StatusBarDatum[]; height?: number }) {
  if (data.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-sm text-muted-foreground">
        No bookings yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={16}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="0" />
        <XAxis
          dataKey="label"
          axisLine={{ stroke: "var(--chart-axis)" }}
          tickLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          width={32}
          allowDecimals={false}
        />
        <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<ChartTooltip />} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((entry) => (
            <Cell key={entry.status} fill={STATUS_COLOR[entry.status] ?? "var(--chart-1)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
