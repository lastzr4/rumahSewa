import { prisma } from "@/lib/prisma";

/**
 * Flips PENDING utility bills into OVERDUE once their explicit due date has
 * passed. Unlike rent, utility amounts vary bill-to-bill, so there's no
 * auto-generation step — bills are added manually, this just keeps their
 * status current whenever a tenant's page is loaded.
 */
export async function markOverdueUtilities() {
  const now = new Date();

  await prisma.utilityBill.updateMany({
    where: { status: "PENDING", dueDate: { lt: now } },
    data: { status: "OVERDUE" },
  });
}
