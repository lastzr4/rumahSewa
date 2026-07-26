import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";
import { monthKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

const emptyToNull = (v: unknown) => (v === "" ? null : v);

const updateSchema = z.object({
  month: z.coerce.date().optional(),
  category: z.string().min(1).optional(),
  amountDue: z.coerce.number().positive().optional(),
  amountPaid: z.coerce.number().nonnegative().optional().nullable(),
  status: z.enum(["PAID", "PENDING", "OVERDUE"]).optional(),
  dueDate: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  paymentDate: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  notes: z.string().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = { ...parsed.data };
  if (data.month) data.month = monthKey(data.month);

  // Marking a bill PAID without an explicit amount/date fills in sensible
  // defaults, same convenience the rent tracker gives.
  if (data.status === "PAID" && !data.paymentDate) {
    data.paymentDate = new Date();
  }

  try {
    const existing = await prisma.utilityBill.findUniqueOrThrow({ where: { id: params.id } });
    const bill = await prisma.utilityBill.update({
      where: { id: params.id },
      data: {
        ...data,
        amountPaid:
          data.status === "PAID" && data.amountPaid == null
            ? existing.amountDue
            : data.amountPaid,
      },
      include: { photos: true },
    });
    return NextResponse.json({ utilityBill: bill });
  } catch {
    return NextResponse.json({ error: "Utility bill not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const bill = await prisma.utilityBill.findUnique({
    where: { id: params.id },
    include: { photos: true },
  });
  if (!bill) {
    return NextResponse.json({ error: "Utility bill not found" }, { status: 404 });
  }

  await prisma.utilityBill.delete({ where: { id: params.id } });

  await Promise.all(
    bill.photos.map((p) => deleteFile(p.fileUrl).catch(() => {}))
  );

  return NextResponse.json({ ok: true });
}
