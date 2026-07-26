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

/**
 * Flips PENDING payments into OVERDUE once their tenant's rent due day for
 * that billing month has passed — e.g. a tenant due on the 5th goes overdue
 * on the 6th of that same month, not only once the whole month has elapsed.
 */
export async function markOverduePayments() {
  const now = new Date();

  const pending = await prisma.payment.findMany({
    where: { status: "PENDING" },
    select: {
      id: true,
      month: true,
      tenant: { select: { rentDueDay: true } },
    },
  });

  const overdueIds = pending
    .filter((p) => {
      const due = new Date(
        Date.UTC(p.month.getUTCFullYear(), p.month.getUTCMonth(), p.tenant.rentDueDay)
      );
      return now > due;
    })
    .map((p) => p.id);

  if (overdueIds.length > 0) {
    await prisma.payment.updateMany({
      where: { id: { in: overdueIds } },
      data: { status: "OVERDUE" },
    });
  }
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
