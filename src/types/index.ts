import type { Tenant, Document, Payment } from "@prisma/client";

export type TenantWithRelations = Tenant & {
  documents: Document[];
  payments: Payment[];
};

export type DashboardSummary = {
  activeTenants: number;
  collectedThisMonth: number;
  pendingCount: number;
  pendingAmount: number;
  overdueCount: number;
  overdueTenants: { id: string; name: string; unit: string; amountDue: number }[];
};
