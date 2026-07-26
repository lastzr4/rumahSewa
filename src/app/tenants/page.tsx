"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Phone, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TenantForm, type TenantFormValues } from "@/components/tenant-form";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { formatCurrency, formatMonth, initials, rentReminderMessage } from "@/lib/utils";

type TenantListItem = {
  id: string;
  name: string;
  phone: string;
  unit: string;
  monthlyRent: string;
  occupants: number;
  status: "ACTIVE" | "INACTIVE";
  payments: { status: "PAID" | "PENDING" | "OVERDUE" }[];
  _count: { documents: number };
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    const res = await fetch(`/api/tenants${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    const data = await res.json();
    setTenants(data.tenants ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(query), 250);
    return () => clearTimeout(t);
  }, [query, load]);

  const handleCreate = async (values: TenantFormValues) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(Object.values(data.error ?? {}).flat().join(" ") || "Could not save tenant");
      }
      setFormOpen(false);
      await load(query);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex flex-col gap-4 p-4 pt-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tenants</h1>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, unit, or phone"
          className="pl-9"
        />
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading tenants...</p>
      ) : tenants.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No tenants yet. Tap "Add" to create your first tenant.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {tenants.map((t) => {
            const latest = t.payments[0]?.status;
            return (
              <Link key={t.id} href={`/tenants/${t.id}`}>
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {initials(t.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{t.name}</p>
                        {t.status === "INACTIVE" && <Badge variant="muted">Inactive</Badge>}
                      </div>
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        Unit {t.unit} · <Phone className="h-3 w-3" /> {t.phone} ·{" "}
                        <Users className="h-3 w-3" /> {t.occupants}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(t.monthlyRent)}</p>
                      {latest && (
                        <p
                          className={
                            latest === "PAID"
                              ? "text-xs text-success"
                              : latest === "OVERDUE"
                              ? "text-xs text-destructive"
                              : "text-xs text-warning"
                          }
                        >
                          {latest.charAt(0) + latest.slice(1).toLowerCase()}
                        </p>
                      )}
                    </div>
                    <WhatsAppButton
                      phone={t.phone}
                      size="icon"
                      label=""
                      message={rentReminderMessage({
                        tenantName: t.name,
                        unit: t.unit,
                        month: formatMonth(new Date()),
                        amount: t.monthlyRent,
                        overdue: latest === "OVERDUE",
                      })}
                    />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <TenantForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        submitting={submitting}
        title="Add tenant"
      />
    </main>
  );
}
