import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";

const config = {
  PAID: { variant: "success" as const, icon: CheckCircle2, label: "Paid" },
  PENDING: { variant: "warning" as const, icon: Clock, label: "Pending" },
  OVERDUE: { variant: "destructive" as const, icon: AlertTriangle, label: "Overdue" },
};

export function PaymentStatusBadge({ status }: { status: keyof typeof config }) {
  const { variant, icon: Icon, label } = config[status];
  return (
    <Badge variant={variant}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
