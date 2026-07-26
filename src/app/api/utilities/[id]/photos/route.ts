import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const bill = await prisma.utilityBill.findUnique({ where: { id: params.id } });
  if (!bill) {
    return NextResponse.json({ error: "Utility bill not found" }, { status: 404 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
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

  const result = await uploadFile(file, `utilities/${bill.id}`);

  const photo = await prisma.utilityPhoto.create({
    data: {
      utilityBillId: bill.id,
      fileName: result.fileName,
      fileUrl: result.url,
      mimeType: result.mimeType,
      size: result.size,
    },
  });

  return NextResponse.json({ photo }, { status: 201 });
}
