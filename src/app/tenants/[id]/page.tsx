"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2, Phone, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaymentStatusBadge } from "@/components/payment-status-badge";
import { TenantForm, type TenantFormValues } from "@/components/tenant-form";
import { FileUploadButton, DocumentLink } from "@/components/file-upload";
import { formatCurrency, formatDate, formatMonth } from "@/lib/utils";

type TenantDetail = {
  id: string;
  name: string;
  phone: string;
  unit: string;
  monthlyRent: string;
  leaseStart: string;
  leaseEnd: string;
  status: "ACTIVE" | "INACTIVE";
  notes: string | null;
  documents: {
    id: string;
    type: string;
    fileName: string;
    fileUrl: string;
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
};

const DOC_LABELS: Record<string, string> = {
  TENANT_ID: "Tenant ID",
  LEASE_AGREEMENT: "Lease Agreement / TnC",
  RECEIPT: "Receipt",
  OTHER: "Other document",
};

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

  if (loading) {
    return <p className="p-6 text-center text-sm text-muted-foreground">Loading...</p>;
  }
  if (!tenant) {
    return <p className="p-6 text-center text-sm text-muted-foreground">Tenant not found.</p>;
  }

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
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(tenant.leaseStart)} – {formatDate(tenant.leaseEnd)}
          </p>
          {tenant.notes && <p className="pt-1 text-sm">{tenant.notes}</p>}
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
        </div>
        {tenant.documents.length > 0 && (
          <div className="flex flex-col gap-2 pt-1">
            {tenant.documents.map((d) => (
              <div key={d.id} className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{DOC_LABELS[d.type] ?? d.type}</span>
                <DocumentLink fileUrl={d.fileUrl} fileName={d.fileName} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Payment history</h2>
        {tenant.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payment records yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {tenant.payments.map((p) => (
              <Card key={p.id}>
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
                        Receipt
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
