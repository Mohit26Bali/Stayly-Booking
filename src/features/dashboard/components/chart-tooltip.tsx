interface ChartTooltipProps {
  active?: boolean;
  label?: string;
  payload?: { value: number; color?: string; name?: string }[];
  formatValue?: (value: number) => string;
}

export function ChartTooltip({ active, label, payload, formatValue }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span
              className="h-0.5 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="font-semibold text-foreground">
              {formatValue ? formatValue(entry.value) : entry.value}
            </span>
            {entry.name && <span className="text-muted-foreground">{entry.name}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
