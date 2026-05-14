import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function formatCurrency(value: number, options?: { compact?: boolean }) {
  if (options?.compact && Math.abs(value) >= 10000) {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(iso: string, pattern = "d 'de' MMMM, yyyy") {
  try {
    return format(parseISO(iso), pattern, { locale: es });
  } catch {
    return iso;
  }
}

export function formatShortDate(iso: string) {
  return formatDate(iso, "d MMM");
}

export function formatMonthYear(iso: string) {
  return formatDate(iso, "MMMM yyyy");
}

export function formatPercent(value: number, fractionDigits = 0) {
  return `${(value * 100).toFixed(fractionDigits)}%`;
}
