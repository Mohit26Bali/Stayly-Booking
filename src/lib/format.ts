const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(value: number | string): string {
  return inrFormatter.format(typeof value === "string" ? Number(value) : value);
}
