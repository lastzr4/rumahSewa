"use client";

import { useRef, useState } from "react";
import { Plus, Trash2, UploadCloud, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PaymentStatusBadge } from "@/components/payment-status-badge";
import { DocumentLink } from "@/components/file-upload";
import { cn, formatCurrency, formatMonth } from "@/lib/utils";

export type UtilityPhoto = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
};

export type UtilityBill = {
  id: string;
  month: string;
  category: string;
  amountDue: string;
  amountPaid: string | null;
  status: "PAID" | "PENDING" | "OVERDUE";
  dueDate: string | null;
  paymentDate: string | null;
  notes: string | null;
  photos: UtilityPhoto[];
};

const CATEGORY_PRESETS = ["Electricity (TNB)", "Water", "Wifi / Internet", "Sewage / Assessment", "Other"];

function monthInputValue(month: string) {
  return month.slice(0, 7); // YYYY-MM, for <input type="month">
}

export function UtilitiesSection({
  tenantId,
  bills,
  onChange,
}: {
  tenantId: string;
  bills: UtilityBill[];
  onChange: () => void | Promise<void>;
}) {
  const [dialogBill, setDialogBill] = useState<UtilityBill | "new" | null>(null);

  const totalCollected = bills
    .filter((b) => b.status === "PAID")
    .reduce((sum, b) => sum + Number(b.amountPaid ?? b.amountDue), 0);

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Utilities</h2>
        {bills.length > 0 && (
          <p className="text-sm font-medium text-success">{formatCurrency(totalCollected)} collected</p>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => setDialogBill("new")}
      >
        <Plus className="h-4 w-4" />
        Add utility bill
      </Button>

      {bills.length === 0 ? (
        <p className="text-sm text-muted-foreground">No utility bills yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {bills.map((b) => (
            <Card
              key={b.id}
              className={cn(
                "cursor-pointer border-l-4",
                b.status === "PAID" && "border-l-success bg-success/5",
                b.status === "OVERDUE" && "border-l-destructive bg-destructive/5",
                b.status === "PENDING" && "border-l-warning bg-warning/5"
              )}
              onClick={() => setDialogBill(b)}
            >
              <CardContent className="flex items-center justify-between p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {b.category} · {formatMonth(b.month)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(b.amountPaid ?? b.amountDue)}
                    {b.photos.length > 0
                      ? ` · ${b.photos.length} photo${b.photos.length > 1 ? "s" : ""}`
                      : ""}
                  </p>
                </div>
                <PaymentStatusBadge status={b.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {dialogBill && (
        <UtilityBillDialog
          tenantId={tenantId}
          bill={dialogBill === "new" ? null : dialogBill}
          onClose={() => setDialogBill(null)}
          onSaved={onChange}
        />
      )}
    </section>
  );
}

export function UtilityBillDialog({
  tenantId,
  bill,
  onClose,
  onSaved,
}: {
  tenantId: string;
  bill: UtilityBill | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [current, setCurrent] = useState<UtilityBill | null>(bill);
  const [category, setCategory] = useState(bill?.category ?? "");
  const [month, setMonth] = useState(
    bill ? monthInputValue(bill.month) : monthInputValue(new Date().toISOString())
  );
  const [amountDue, setAmountDue] = useState(bill?.amountDue ?? "");
  const [dueDate, setDueDate] = useState(bill?.dueDate ? bill.dueDate.slice(0, 10) : "");
  const [status, setStatus] = useState<UtilityBill["status"]>(bill?.status ?? "PENDING");
  const [amountPaid, setAmountPaid] = useState(bill?.amountPaid ?? "");
  const [paymentDate, setPaymentDate] = useState(bill?.paymentDate ? bill.paymentDate.slice(0, 10) : "");
  const [notes, setNotes] = useState(bill?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    if (!category.trim() || !amountDue) {
      setError("Category and amount are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        tenantId,
        month: `${month}-01`,
        category,
        amountDue,
        dueDate,
        status,
        amountPaid: status === "PAID" ? amountPaid || amountDue : amountPaid || null,
        paymentDate,
        notes,
      };
      const res = await fetch(current ? `/api/utilities/${current.id}` : "/api/utilities", {
        method: current ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          Object.values(data.error ?? {}).flat().join(" ") || "Could not save utility bill"
        );
      }
      const data = await res.json();
      setCurrent(data.utilityBill);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save utility bill");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBill = async () => {
    if (!current) return;
    if (!confirm("Delete this utility bill and its photos? This cannot be undone.")) return;
    await fetch(`/api/utilities/${current.id}`, { method: "DELETE" });
    await onSaved();
    onClose();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !current) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`/api/utilities/${current.id}/photos`, {
          method: "POST",
          body: form,
        });
        if (res.ok) {
          const data = await res.json();
          setCurrent((c) => (c ? { ...c, photos: [data.photo, ...c.photos] } : c));
        }
      }
      await onSaved();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Delete this photo?")) return;
    await fetch(`/api/utility-photos/${photoId}`, { method: "DELETE" });
    setCurrent((c) => (c ? { ...c, photos: c.photos.filter((p) => p.id !== photoId) } : c));
    await onSaved();
  };

  return (
    <Dialog open onOpenChange={onClose} title={current ? "Edit utility bill" : "Add utility bill"}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category">Category *</Label>
          <Input
            id="category"
            list="utility-categories"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Electricity (TNB)"
          />
          <datalist id="utility-categories">
            {CATEGORY_PRESETS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="month">Month</Label>
            <Input id="month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amountDue">Amount due (RM) *</Label>
            <Input
              id="amountDue"
              type="number"
              min="0"
              step="0.01"
              value={amountDue}
              onChange={(e) => setAmountDue(e.target.value)}
              placeholder="85"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dueDate">Due date</Label>
            <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value as UtilityBill["status"])}>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
            </Select>
          </div>
        </div>

        {status === "PAID" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amountPaid">Amount paid (RM)</Label>
              <Input
                id="amountPaid"
                type="number"
                min="0"
                step="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder={amountDue || "0"}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paymentDate">Payment date</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <p className="text-sm font-medium">Photos (bill, meter reading, receipt, etc.)</p>
          {!current ? (
            <p className="text-xs text-muted-foreground">Save this bill first, then attach photos.</p>
          ) : (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="hidden"
                onChange={handleUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                Add photos
              </Button>
              {current.photos.length > 0 && (
                <div className="flex flex-col gap-2 pt-1">
                  {current.photos.map((p) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <DocumentLink fileUrl={p.fileUrl} fileName={p.fileName} mimeType={p.mimeType} />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePhoto(p.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center justify-between gap-2 pt-2">
          {current ? (
            <Button type="button" variant="ghost" onClick={handleDeleteBill}>
              <Trash2 className="h-4 w-4 text-destructive" />
              Delete bill
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
