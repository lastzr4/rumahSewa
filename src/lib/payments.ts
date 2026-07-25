import { prisma } from "@/lib/prisma";
import { monthKey } from "@/lib/utils";
import type { DashboardSummary } from "@/types";

/**
 * Ensures every currently-active tenant whose lease covers the given month
 * has a Payment row for it (defaulting to PENDING). Safe to call repeatedly.
 */
export async function ensureMonthPayments(month: Date) {
  const key = monthKey(month);
  const nextMonth = new Date(Date.UTC(key.getUTCFullYear(), key.getUTCMonth() + 1, 1));

  const tenants = await prisma.tenant.findMany({
    where: {
      status: "ACTIVE",
      leaseStart: { lt: nextMonth },
      leaseEnd: { gte: key },
    },
    select: { id: true, monthlyRent: true },
  });

  await Promise.all(
    tenants.map((t) =>
      prisma.payment.upsert({
        where: { tenantId_month: { tenantId: t.id, month: key } },
        create: {
          tenantId: t.id,
          month: key,
          amountDue: t.monthlyRent,
          status: "PENDING",
        },
        update: {},
      })
    )
  );
}

/** Flips PENDING payments whose month has fully elapsed into OVERDUE. */
export async function markOverduePayments() {
  const currentMonth = monthKey(new Date());
  await prisma.payment.updateMany({
    where: { status: "PENDING", month: { lt: currentMonth } },
    data: { status: "OVERDUE" },
  });
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const currentMonth = monthKey(new Date());
  await ensureMonthPayments(currentMonth);
  await markOverduePayments();

  const [activeTenants, paidThisMonth, pending, overdue] = await Promise.all([
    prisma.tenant.count({ where: { status: "ACTIVE" } }),
    prisma.payment.aggregate({
      where: { month: currentMonth, status: "PAID" },
      _sum: { amountPaid: true },
    }),
    prisma.payment.aggregate({
      where: { status: "PENDING" },
      _sum: { amountDue: true },
      _count: true,
    }),
    prisma.payment.findMany({
      where: { status: "OVERDUE" },
      include: { tenant: { select: { id: true, name: true, unit: true } } },
      orderBy: { month: "asc" },
    }),
  ]);

  return {
    activeTenants,
    collectedThisMonth: Number(paidThisMonth._sum.amountPaid ?? 0),
    pendingCount: pending._count,
    pendingAmount: Number(pending._sum.amountDue ?? 0),
    overdueCount: overdue.length,
    overdueTenants: overdue.map((p) => ({
      id: p.tenant.id,
      name: p.tenant.name,
      unit: p.tenant.unit,
      amountDue: Number(p.amountDue),
    })),
  };
}
