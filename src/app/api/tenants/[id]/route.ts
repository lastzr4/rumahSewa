import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { markOverdueUtilities } from "@/lib/utilities";

export const dynamic = "force-dynamic";

// Empty-string dates come from the form when a field is left blank; treat
// them as "not set" instead of letting zod's date coercion choke on "".
const emptyToNull = (v: unknown) => (v === "" ? null : v);

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
  monthlyRent: z.coerce.number().positive().optional(),
  occupants: z.coerce.number().int().positive().optional(),
  rentDueDay: z.coerce.number().int().min(1).max(31).optional(),
  depositAmount: z.coerce.number().nonnegative().optional(),
  depositPaid: z.coerce.boolean().optional(),
  depositPaidDate: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  leaseStart: z.coerce.date().optional(),
  leaseEnd: z.coerce.date().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  notes: z.string().optional().nullable(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await markOverdueUtilities();

  const tenant = await prisma.tenant.findUnique({
    where: { id: params.id },
    include: {
      documents: { orderBy: { uploadedAt: "desc" } },
      payments: { orderBy: { month: "desc" } },
      utilityBills: {
        orderBy: { month: "desc" },
        include: { photos: { orderBy: { uploadedAt: "desc" } } },
      },
    },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  return NextResponse.json({ tenant });
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

  try {
    const tenant = await prisma.tenant.update({
      where: { id: params.id },
      data: parsed.data,
    });
    return NextResponse.json({ tenant });
  } catch {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.tenant.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
}
