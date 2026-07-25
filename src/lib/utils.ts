import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  const amount = Number.isFinite(n) ? n : 0;
  // Intl's MYR formatting is inconsistent across runtimes (some emit "MYR",
  // some "RM"), so we format the number plainly and prefix "RM" ourselves.
  const formatted = new Intl.NumberFormat("en-MY", {
    maximumFractionDigits: 0,
  }).format(amount);
  return `RM${formatted}`;
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function formatMonth(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(d);
}

/** Normalize any date to the 1st of its month at UTC midnight, used as the
 * canonical key for a Payment's billing month. */
export function monthKey(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
