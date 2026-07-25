import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function monthStart(offset: number) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
}

async function main() {
  const tenants = [
    {
      name: "Amara Okafor",
      phone: "+1 555 010 1234",
      unit: "A-101",
      monthlyRent: 1200,
      leaseStart: new Date("2025-01-01"),
      leaseEnd: new Date("2026-12-31"),
    },
    {
      name: "Diego Fernandez",
      phone: "+1 555 010 5678",
      unit: "B-204",
      monthlyRent: 950,
      leaseStart: new Date("2025-06-01"),
      leaseEnd: new Date("2026-05-31"),
    },
    {
      name: "Priya Sharma",
      phone: "+1 555 010 9012",
      unit: "C-310",
      monthlyRent: 1450,
      leaseStart: new Date("2024-11-01"),
      leaseEnd: new Date("2025-10-31"),
      status: "INACTIVE" as const,
    },
  ];

  for (const t of tenants) {
    const tenant = await prisma.tenant.create({ data: t });

    // Last month: paid. This month: pending. Two months ago: overdue.
    await prisma.payment.create({
      data: {
        tenantId: tenant.id,
        month: monthStart(-1),
        amountDue: tenant.monthlyRent,
        amountPaid: tenant.monthlyRent,
        status: "PAID",
        paymentDate: monthStart(-1),
        paymentMethod: "BANK_TRANSFER",
      },
    });
    await prisma.payment.create({
      data: {
        tenantId: tenant.id,
        month: monthStart(0),
        amountDue: tenant.monthlyRent,
        status: "PENDING",
      },
    });
    await prisma.payment.create({
      data: {
        tenantId: tenant.id,
        month: monthStart(-2),
        amountDue: tenant.monthlyRent,
        status: "OVERDUE",
      },
    });
  }

  console.log(`Seeded ${tenants.length} tenants with sample payments.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
