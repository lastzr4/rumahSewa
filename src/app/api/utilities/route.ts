import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { monthKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

const emptyToNull = (v: unknown) => (v === "" ? null : v);

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
