import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  let document;
  try {
    document = await prisma.document.delete({ where: { id: params.id } });
  } catch {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Best-effort: the DB record is already gone, so a storage hiccup here
  // shouldn't surface as a failure to the user.
  try {
    await deleteFile(document.fileUrl);
  } catch {
    // ignore
  }

  return NextResponse.json({ ok: true });
}
