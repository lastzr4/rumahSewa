import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const tenantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone number is required"),
  unit: z.string().min(1, "Unit/room number is required"),
  monthlyRent: z.coerce.number().positive("Rent must be greater than 0"),
  leaseStart: z.coerce.date(),
  leaseEnd: z.coerce.date(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  notes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const status = req.nextUrl.searchParams.get("status");

  const tenants = await prisma.tenant.findMany({
    where: {
      ...(status === "ACTIVE" || status === "INACTIVE" ? { status } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { unit: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      payments: { orderBy: { month: "desc" }, take: 1 },
      _count: { select: { documents: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ tenants });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = tenantSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  if (parsed.data.leaseEnd < parsed.data.leaseStart) {
    return NextResponse.json(
      { error: { leaseEnd: ["Lease end must be after lease start"] } },
      { status: 400 }
    );
  }

  const tenant = await prisma.tenant.create({ data: parsed.data });
  return NextResponse.json({ tenant }, { status: 201 });
}
