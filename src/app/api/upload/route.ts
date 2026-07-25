import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["TENANT_ID", "LEASE_AGREEMENT", "RECEIPT", "OTHER"] as const;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const tenantId = form.get("tenantId");
  const type = form.get("type");
  const paymentId = form.get("paymentId");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (typeof tenantId !== "string" || !tenantId) {
    return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
  }
  if (typeof type !== "string" || !ALLOWED_TYPES.includes(type as any)) {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 400 });
  }
  if (file.type && !ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: "Only JPG, PNG, WEBP, HEIC or PDF files are allowed" },
      { status: 400 }
    );
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const result = await uploadFile(file, tenantId);

  const document = await prisma.document.create({
    data: {
      tenantId,
      type: type as (typeof ALLOWED_TYPES)[number],
      fileName: result.fileName,
      fileUrl: result.url,
      mimeType: result.mimeType,
      size: result.size,
    },
  });

  if (type === "RECEIPT" && typeof paymentId === "string" && paymentId) {
    await prisma.payment.update({
      where: { id: paymentId },
      data: { receiptUrl: result.url },
    });
  }

  return NextResponse.json({ document }, { status: 201 });
}
