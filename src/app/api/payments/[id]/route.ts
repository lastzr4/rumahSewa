import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  status: z.enum(["PAID", "PENDING", "OVERDUE"]).optional(),
  amountPaid: z.coerce.number().nonnegative().optional().nullable(),
  paymentDate: z.coerce.date().optional().nullable(),
  paymentMethod: z
    .enum(["CASH", "BANK_TRANSFER", "CARD", "MOBILE_MONEY", "CHECK", "OTHER"])
    .optional()
    .nullable(),
  receiptUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const payment = await prisma.payment.findUnique({
    where: { id: params.id },
    include: { tenant: true },
  });
  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }
  return NextResponse.json({ payment });
}

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

  // Marking a payment PAID without an explicit date/amount fills in sensible
  // defaults so a single tap in the tracker is enough to record it.
  if (data.status === "PAID") {
    if (!data.paymentDate) data.paymentDate = new Date();
  }

  try {
    const existing = await prisma.payment.findUniqueOrThrow({
      where: { id: params.id },
    });

    const payment = await prisma.payment.update({
      where: { id: params.id },
      data: {
        ...data,
        amountPaid:
          data.status === "PAID" && data.amountPaid == null
            ? existing.amountDue
            : data.amountPaid,
      },
    });
    return NextResponse.json({ payment });
  } catch {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.payment.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }
}
