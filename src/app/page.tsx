import Link from "next/link";
import { Users, Banknote, Clock, AlertTriangle } from "lucide-react";
import { getDashboardSummary } from "@/lib/payments";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatMonth } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <main className="flex flex-col gap-5 p-4 pt-6">
      <header>
        <p className="text-sm text-muted-foreground">{formatMonth(new Date())}</p>
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Active tenants" value={summary.activeTenants} icon={Users} />
        <StatCard
          label="Collected this month"
          value={formatCurrency(summary.collectedThisMonth)}
          icon={Banknote}
          tone="success"
        />
        <StatCard
          label="Pending payments"
          value={`${summary.pendingCount} · ${formatCurrency(summary.pendingAmount)}`}
          icon={Clock}
          tone="warning"
        />
        <StatCard
          label="Overdue alerts"
          value={summary.overdueCount}
          icon={AlertTriangle}
          tone="destructive"
        />
      </div>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Overdue tenants</h2>
          <Link href="/payments" className="text-sm text-primary">
            View tracker
          </Link>
        </div>

        {summary.overdueTenants.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              No overdue payments. Nice work.
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {summary.overdueTenants.map((t) => (
              <Link key={t.id} href={`/tenants/${t.id}`}>
                <Card>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">Unit {t.unit}</p>
                    </div>
                    <span className="text-sm font-semibold text-destructive">
                      {formatCurrency(t.amountDue)}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/tenants">
          <Card className="h-full">
            <CardContent className="flex h-full items-center justify-center p-5 text-sm font-medium">
              Manage tenants
            </CardContent>
          </Card>
        </Link>
        <Link href="/payments">
          <Card className="h-full">
            <CardContent className="flex h-full items-center justify-center p-5 text-sm font-medium">
              Payment tracker
            </CardContent>
          </Card>
        </Link>
      </div>
    </main>
  );
}
