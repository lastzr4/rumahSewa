"use client";

import { useRef, useState } from "react";
import { UploadCloud, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FileUploadButton({
  tenantId,
  type,
  paymentId,
  label,
  onUploaded,
}: {
  tenantId: string;
  type: "TENANT_ID" | "LEASE_AGREEMENT" | "RECEIPT" | "OTHER";
  paymentId?: string;
  label: string;
  onUploaded?: (fileUrl: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("tenantId", tenantId);
      form.append("type", type);
      if (paymentId) form.append("paymentId", paymentId);

      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onUploaded?.(data.document.fileUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UploadCloud className="h-4 w-4" />
        )}
        {label}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function isImageFile(mimeType?: string | null, fileUrl?: string) {
  if (mimeType?.startsWith("image/")) return true;
  if (fileUrl && /\.(jpe?g|png|webp|heic|gif)(\?.*)?$/i.test(fileUrl)) return true;
  return false;
}

export function DocumentLink({
  fileUrl,
  fileName,
  mimeType,
}: {
  fileUrl: string;
  fileName: string;
  mimeType?: string | null;
}) {
  if (isImageFile(mimeType, fileUrl)) {
    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded-lg border border-border p-2 text-sm hover:bg-accent"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fileUrl}
          alt={fileName}
          className="h-14 w-14 shrink-0 rounded-md border border-border object-cover"
        />
        <span className="truncate">{fileName}</span>
      </a>
    );
  }
  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"
    >
      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{fileName}</span>
    </a>
  );
}
