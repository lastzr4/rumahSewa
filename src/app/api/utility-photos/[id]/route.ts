import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  let photo;
  try {
    photo = await prisma.utilityPhoto.delete({ where: { id: params.id } });
  } catch {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  try {
    await deleteFile(photo.fileUrl);
  } catch {
    // ignore — DB row is already gone
  }

  return NextResponse.json({ ok: true });
}
