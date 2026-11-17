"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChartTooltip } from "@/features/dashboard/components/chart-tooltip";
import type { MonthlyPoint } from "@/server/dashboard/charts";

export function TrendChart({
  data,
  color = "var(--chart-1)",
  formatValue,
  height = 220,
}: {
  data: MonthlyPoint[];
  color?: string;
  formatValue?: (value: number) => string;
  height?: number;
}) {
  const hasData = data.some((d) => d.value > 0);

  if (!hasData) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-sm text-muted-foreground"
      >
        No data for this period yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid
          vertical={false}
          stroke="var(--chart-grid)"
          strokeDasharray="0"
        />
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
          tickFormatter={formatValue}
          width={formatValue ? 56 : 32}
        />
        <Tooltip
          cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
          content={<ChartTooltip formatValue={formatValue} />}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={color}
          fillOpacity={0.1}
          dot={{ r: 4, fill: color, stroke: "var(--card)", strokeWidth: 2 }}
          activeDot={{ r: 5, fill: color, stroke: "var(--card)", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
