"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2, Phone, Calendar, Users, Wallet, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaymentStatusBadge } from "@/components/payment-status-badge";
import { TenantForm, type TenantFormValues } from "@/components/tenant-form";
import { FileUploadButton, DocumentLink } from "@/components/file-upload";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { UtilitiesSection, type UtilityBill } from "@/components/utilities-section";
import {
  cn,
  formatCurrency,
  formatDate,
  formatMonth,
  monthKey,
  ordinal,
  rentReminderMessage,
} from "@/lib/utils";

type TenantDetail = {
  id: string;
  name: string;
  phone: string;
  unit: string;
  monthlyRent: string;
  occupants: number;
  rentDueDay: number;
  depositAmount: string;
  depositPaid: boolean;
  depositPaidDate: string | null;
  leaseStart: string;
  leaseEnd: string;
  status: "ACTIVE" | "INACTIVE";
  notes: string | null;
  documents: {
    id: string;
    type: string;
    fileName: string;
    fileUrl: string;
    mimeType: string | null;
  }[];
  payments: {
    id: string;
    month: string;
    amountDue: string;
    amountPaid: string | null;
    status: "PAID" | "PENDING" | "OVERDUE";
    paymentMethod: string | null;
    receiptUrl: string | null;
  }[];
  utilityBills: UtilityBill[];
};

const DOC_LABELS: Record<string, string> = {
  TENANT_ID: "Tenant ID",
  LEASE_AGREEMENT: "Lease Agreement / TnC",
  RECEIPT: "Receipt",
  OTHER: "Photo / other document",
};

/** Builds the reminder params for whichever payment matches the current
 * billing month, falling back to the tenant's standard monthly rent if no
 * payment row exists for this month yet. */
function currentMonthReminder(tenant: TenantDetail) {
  const key = monthKey(new Date()).getTime();
  const current = tenant.payments.find((p) => monthKey(p.month).getTime() === key);
  return {
    tenantName: tenant.name,
    unit: tenant.unit,
    month: formatMonth(new Date()),
    amount: current ? current.amountDue : tenant.monthlyRent,
    overdue: current?.status === "OVERDUE",
    dueDay: tenant.rentDueDay,
  };
}

export default function TenantDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/tenants/${params.id}`);
    if (res.ok) {
      const data = await res.json();
      setTenant(data.tenant);
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdate = async (values: TenantFormValues) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tenants/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Could not update tenant");
      setEditOpen(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this tenant and all their records? This cannot be undone.")) return;
    await fetch(`/api/tenants/${params.id}`, { method: "DELETE" });
    router.push("/tenants");
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm("Delete this file? This cannot be undone.")) return;
    await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
    await load();
  };

  if (loading) {
    return <p className="p-6 text-center text-sm text-muted-foreground">Loading...</p>;
  }
  if (!tenant) {
    return <p className="p-6 text-center text-sm text-muted-foreground">Tenant not found.</p>;
  }

  const totalCollected = tenant.payments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + Number(p.amountPaid ?? p.amountDue), 0);

  return (
    <main className="flex flex-col gap-5 p-4 pt-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.push("/tenants")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="flex-1 truncate text-xl font-bold">{tenant.name}</h1>
        <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-2 p-4">
          <div className="flex items-center justify-between">
            <Badge variant={tenant.status === "ACTIVE" ? "success" : "muted"}>
              {tenant.status === "ACTIVE" ? "Active" : "Inactive"}
            </Badge>
            <span className="text-lg font-semibold">{formatCurrency(tenant.monthlyRent)}/mo</span>
          </div>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5" /> {tenant.phone} · Unit {tenant.unit}
          </p>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {tenant.occupants} {tenant.occupants === 1 ? "occupant" : "occupants"}
          </p>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(tenant.leaseStart)} – {formatDate(tenant.leaseEnd)}
            <span className="text-muted-foreground/70">
              · rent due {ordinal(tenant.rentDueDay)}
            </span>
          </p>
          <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2">
            <p className="flex items-center gap-1.5 text-sm">
              <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
              Deposit: {formatCurrency(tenant.depositAmount)}
            </p>
            <Badge variant={tenant.depositPaid ? "success" : "muted"}>
              {tenant.depositPaid
                ? `Received${tenant.depositPaidDate ? ` ${formatDate(tenant.depositPaidDate)}` : ""}`
                : "Not received"}
            </Badge>
          </div>
          {tenant.notes && <p className="pt-1 text-sm">{tenant.notes}</p>}
          <WhatsAppButton
            phone={tenant.phone}
            label="Send rent reminder"
            className="mt-1 w-full"
            message={rentReminderMessage(currentMonthReminder(tenant))}
          />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Documents</h2>
        <div className="flex flex-wrap gap-2">
          <FileUploadButton
            tenantId={tenant.id}
            type="TENANT_ID"
            label="Upload ID"
            onUploaded={load}
          />
          <FileUploadButton
            tenantId={tenant.id}
            type="LEASE_AGREEMENT"
            label="Upload lease / TnC"
            onUploaded={load}
          />
          <FileUploadButton
            tenantId={tenant.id}
            type="OTHER"
            label="Upload photo"
            onUploaded={load}
          />
        </div>
        {tenant.documents.length > 0 && (
          <div className="flex flex-col gap-2 pt-1">
            {tenant.documents.map((d) => (
              <div key={d.id} className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-xs text-muted-foreground">{DOC_LABELS[d.type] ?? d.type}</span>
                  <DocumentLink fileUrl={d.fileUrl} fileName={d.fileName} mimeType={d.mimeType} />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteDocument(d.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <UtilitiesSection tenantId={tenant.id} bills={tenant.utilityBills} onChange={load} />

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Payment history</h2>
          {tenant.payments.length > 0 && (
            <p className="flex items-center gap-1 text-sm font-medium text-success">
              <TrendingUp className="h-3.5 w-3.5" />
              {formatCurrency(totalCollected)} collected
            </p>
          )}
        </div>
        {tenant.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payment records yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {tenant.payments.map((p) => (
              <Card
                key={p.id}
                className={cn(
                  "border-l-4",
                  p.status === "PAID" && "border-l-success bg-success/5",
                  p.status === "OVERDUE" && "border-l-destructive bg-destructive/5",
                  p.status === "PENDING" && "border-l-warning bg-warning/5"
                )}
              >
                <CardContent className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-medium">{formatMonth(p.month)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(p.amountPaid ?? p.amountDue)}
                      {p.paymentMethod ? ` · ${p.paymentMethod.replaceAll("_", " ")}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.receiptUrl && (
                      <a
                        href={p.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary underline"
                      >
                        {/\.(jpe?g|png|webp|heic|gif)(\?.*)?$/i.test(p.receiptUrl) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.receiptUrl}
                            alt="Receipt"
                            className="h-9 w-9 rounded border border-border object-cover"
                          />
                        ) : (
                          "Receipt"
                        )}
                      </a>
                    )}
                    <PaymentStatusBadge status={p.status} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <TenantForm
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit tenant"
        initial={{
          name: tenant.name,
          phone: tenant.phone,
          unit: tenant.unit,
          monthlyRent: tenant.monthlyRent,
          occupants: String(tenant.occupants ?? 1),
          rentDueDay: String(tenant.rentDueDay ?? 1),
          depositAmount: tenant.depositAmount ?? "0",
          depositPaid: tenant.depositPaid ?? false,
          depositPaidDate: tenant.depositPaidDate ? tenant.depositPaidDate.slice(0, 10) : "",
          leaseStart: tenant.leaseStart.slice(0, 10),
          leaseEnd: tenant.leaseEnd.slice(0, 10),
          status: tenant.status,
          notes: tenant.notes ?? "",
        }}
        onSubmit={handleUpdate}
        submitting={submitting}
      />
    </main>
  );
}
