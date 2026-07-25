import { NextResponse } from "next/server";
import { getDashboardSummary } from "@/lib/payments";

// This route reads live data on every request and must never be statically
// prerendered at build time (the build environment may not have DB access).
export const dynamic = "force-dynamic";

export async function GET() {
  const summary = await getDashboardSummary();
  return NextResponse.json(summary);
}
