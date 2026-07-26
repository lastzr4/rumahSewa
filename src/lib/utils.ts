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

/**
 * Normalizes a Malaysian phone number for wa.me links: strips everything but
 * digits, then converts a local "0..." number to the "60..." country-code
 * form WhatsApp expects. Numbers already in international form (60... or
 * with a + prefix) pass through unchanged.
 */
export function toWhatsAppNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("60")) return digits;
  if (digits.startsWith("0")) return `60${digits.slice(1)}`;
  return digits;
}

/** Builds a wa.me deep link that opens a chat with a pre-filled message. */
export function whatsAppLink(phone: string, message: string) {
  return `https://wa.me/${toWhatsAppNumber(phone)}?text=${encodeURIComponent(message)}`;
}

/** Standard monthly rent reminder template, personalized per tenant/payment. */
export function rentReminderMessage({
  tenantName,
  unit,
  month,
  amount,
  overdue,
}: {
  tenantName: string;
  unit: string;
  month: string;
  amount: string | number;
  overdue?: boolean;
}) {
  const amountStr = formatCurrency(amount);
  if (overdue) {
    return `Hai ${tenantName}, ini peringatan bahawa bayaran sewa unit ${unit} bagi bulan ${month} sebanyak ${amountStr} masih belum diterima dan telah tertunggak. Sila buat pembayaran secepat mungkin. Terima kasih 🙏`;
  }
  return `Hai ${tenantName}, ini peringatan mesra untuk bayaran sewa unit ${unit} bagi bulan ${month} sebanyak ${amountStr}. Sila buat pembayaran sebelum tarikh akhir bulan ini. Terima kasih 🙏`;
}
