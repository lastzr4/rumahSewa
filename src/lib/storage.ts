import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export type UploadResult = {
  url: string;
  path: string;
  size: number;
  mimeType: string;
  fileName: string;
};

const provider = (process.env.STORAGE_PROVIDER || "local").toLowerCase();

/**
 * Stores an uploaded file and returns a public URL for it.
 * Switches transparently between local disk storage and Supabase Storage
 * based on the STORAGE_PROVIDER env var, so API routes never need to know
 * which backend is active.
 */
export async function uploadFile(
  file: File,
  folder: string
): Promise<UploadResult> {
  if (provider === "supabase") {
    return uploadToSupabase(file, folder);
  }
  return uploadToLocalDisk(file, folder);
}

// Deliberately stored OUTSIDE the Next.js "public" folder. A Railway volume
// mounted straight onto public/uploads introduces an ext4 lost+found
// directory owned by root, which crashes Next's static-file scan (EACCES)
// at startup because the app runs as a non-root user. Storing uploads in
// their own directory and serving them through /api/files/* sidesteps that
// entirely — Next never scans this folder.
export const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

async function uploadToLocalDisk(file: File, folder: string): Promise<UploadResult> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || "";
  const safeName = `${randomUUID()}${ext}`;
  const dir = path.join(UPLOAD_ROOT, folder);
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, safeName);
  await writeFile(filePath, bytes);

  return {
    url: `/api/files/${folder}/${safeName}`,
    path: filePath,
    size: bytes.length,
    mimeType: file.type || "application/octet-stream",
    fileName: file.name,
  };
}

async function uploadToSupabase(file: File, folder: string): Promise<UploadResult> {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "property-documents";

  if (!url || !serviceKey) {
    throw new Error(
      "STORAGE_PROVIDER=supabase requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  const supabase = createClient(url, serviceKey);
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || "";
  const objectPath = `${folder}/${randomUUID()}${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(objectPath, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);

  return {
    url: data.publicUrl,
    path: objectPath,
    size: bytes.length,
    mimeType: file.type || "application/octet-stream",
    fileName: file.name,
  };
}
