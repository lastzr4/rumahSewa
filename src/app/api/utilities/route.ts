import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { monthKey } from "@/lib/utils";
import { markOverdueUtilities } from "@/lib/utilities";

export const dynamic = "force-dynamic";

const emptyToNull = (v: unknown) => (v === "" ? null : v);

// Lists every tenant's utility bills for a given billing month, so the
// Payments tab can show utilities the same way it shows rent — one month
// at a time, across all tenants — instead of only inside each tenant's
// own page.
export async function GET(req: NextRequest) {
  const monthParam = req.nextUrl.searchParams.get("month");
  if (!monthParam) {
    return NextResponse.json({ error: "month is required" }, { status: 400 });
  }

  await markOverdueUtilities();

  const month = monthKey(new Date(`${monthParam}-01`));
  const utilityBills = await prisma.utilityBill.findMany({
    where: { month },
    include: {
      tenant: { select: { id: true, name: true, unit: true, phone: true } },
      photos: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ utilityBills });
}

const createSchema = z.object({
  tenantId: z.string().min(1),
  month: z.coerce.date(),
  category: z.string().min(1, "Category is required"),
  amountDue: z.coerce.number().positive("Amount must be greater than 0"),
  dueDate: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  notes: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: parsed.data.tenantId } });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const bill = await prisma.utilityBill.create({
    data: { ...parsed.data, month: monthKey(parsed.data.month) },
    include: { photos: true },
  });

  return NextResponse.json({ utilityBill: bill }, { status: 201 });
}
