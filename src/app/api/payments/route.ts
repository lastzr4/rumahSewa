import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureMonthPayments, markOverduePayments } from "@/lib/payments";
import { monthKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const monthParam = req.nextUrl.searchParams.get("month"); // "YYYY-MM"
  const month = monthKey(
    monthParam ? new Date(`${monthParam}-01T00:00:00Z`) : new Date()
  );

  await ensureMonthPayments(month);
  await markOverduePayments();

  const payments = await prisma.payment.findMany({
    where: { month },
    include: {
      tenant: { select: { id: true, name: true, unit: true, phone: true, rentDueDay: true } },
    },
    orderBy: { tenant: { unit: "asc" } },
  });

  return NextResponse.json({ month: month.toISOString(), payments });
}
