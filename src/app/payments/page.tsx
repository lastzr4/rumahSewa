"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaymentStatusBadge } from "@/components/payment-status-badge";
import { FileUploadButton } from "@/components/file-upload";
import { formatCurrency, formatMonth, monthKey } from "@/lib/utils";

type PaymentItem = {
  id: string;
  month: string;
  amountDue: string;
  amountPaid: string | null;
  status: "PAID" | "PENDING" | "OVERDUE";
  paymentDate: string | null;
  paymentMethod: string | null;
  receiptUrl: string | null;
  tenant: { id: string; name: string; unit: string; phone: string };
};

const METHODS = ["CASH", "BANK_TRANSFER", "CARD", "MOBILE_MONEY", "CHECK", "OTHER"];

function monthParam(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default function PaymentsPage() {
  const [cursor, setCursor] = useState(() => monthKey(new Date()));
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<PaymentItem | null>(null);

  const load = useCallback(async (month: Date) => {
    setLoading(true);
    const res = await fetch(`/api/payments?month=${monthParam(month)}`);
    const data = await res.json();
    setPayments(data.payments ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(cursor);
  }, [cursor, load]);

  const shiftMonth = (delta: number) => {
    setCursor((c) => new Date(Date.UTC(c.getUTCFullYear(), c.getUTCMonth() + delta, 1)));
  };

  const totals = payments.reduce(
    (acc, p) => {
      acc.due += Number(p.amountDue);
      if (p.status === "PAID") acc.collected += Number(p.amountPaid ?? p.amountDue);
      return acc;
    },
    { due: 0, collected: 0 }
  );

  return (
    <main className="flex flex-col gap-4 p-4 pt-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payments</h1>
      </header>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="font-medium">{formatMonth(cursor)}</p>
        <Button variant="outline" size="icon" onClick={() => shiftMonth(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between p-4 text-sm">
          <span className="text-muted-foreground">Collected / Due</span>
          <span className="font-semibold">
            {formatCurrency(totals.collected)} / {formatCurrency(totals.due)}
          </span>
        </CardContent>
      </Card>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No active tenants with rent due this month.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {payments.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/tenants/${p.tenant.id}`} className="truncate font-medium hover:underline">
                    {p.tenant.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">Unit {p.tenant.unit}</p>
                </div>
                <span className="text-sm font-semibold">{formatCurrency(p.amountDue)}</span>
                <button onClick={() => setActive(p)}>
                  <PaymentStatusBadge status={p.status} />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {active && (
        <RecordPaymentDialog
          payment={active}
          onClose={() => setActive(null)}
          onSaved={() => {
            setActive(null);
            load(cursor);
          }}
        />
      )}
    </main>
  );
}

function RecordPaymentDialog({
  payment,
  onClose,
  onSaved,
}: {
  payment: PaymentItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState(payment.status);
  const [method, setMethod] = useState(payment.paymentMethod ?? "CASH");
  const [date, setDate] = useState(
    payment.paymentDate ? payment.paymentDate.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [amountPaid, setAmountPaid] = useState(payment.amountPaid ?? payment.amountDue);
  const [receiptUrl, setReceiptUrl] = useState(payment.receiptUrl);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`/api/payments/${payment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          paymentMethod: status === "PAID" ? method : null,
          paymentDate: status === "PAID" ? date : null,
          amountPaid: status === "PAID" ? amountPaid : null,
          receiptUrl,
        }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose} title={`${payment.tenant.name} · ${formatMonth(payment.month)}`}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Status</Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value as PaymentItem["status"])}>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
          </Select>
        </div>

        {status === "PAID" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Payment date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Amount paid</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Payment method</Label>
              <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m.replaceAll("_", " ")}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Receipt / proof</Label>
              <FileUploadButton
                tenantId={payment.tenant.id}
                type="RECEIPT"
                paymentId={payment.id}
                label={receiptUrl ? "Replace receipt" : "Upload receipt"}
                onUploaded={setReceiptUrl}
              />
              {receiptUrl && (
                <a href={receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                  View current receipt
                </a>
              )}
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
