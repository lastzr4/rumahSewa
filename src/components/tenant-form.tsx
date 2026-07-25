"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export type TenantFormValues = {
  name: string;
  phone: string;
  unit: string;
  monthlyRent: string;
  leaseStart: string;
  leaseEnd: string;
  status: "ACTIVE" | "INACTIVE";
  notes: string;
};

const EMPTY: TenantFormValues = {
  name: "",
  phone: "",
  unit: "",
  monthlyRent: "",
  leaseStart: "",
  leaseEnd: "",
  status: "ACTIVE",
  notes: "",
};

export function TenantForm({
  open,
  onOpenChange,
  initial,
  onSubmit,
  submitting,
  title = "Add tenant",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<TenantFormValues>;
  onSubmit: (values: TenantFormValues) => Promise<void> | void;
  submitting?: boolean;
  title?: string;
}) {
  const [values, setValues] = useState<TenantFormValues>({ ...EMPTY, ...initial });
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<TenantFormValues>) =>
    setValues((v) => ({ ...v, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!values.name || !values.phone || !values.unit || !values.monthlyRent) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!values.leaseStart || !values.leaseEnd) {
      setError("Please set a lease start and end date.");
      return;
    }
    if (new Date(values.leaseEnd) < new Date(values.leaseStart)) {
      setError("Lease end date must be after the start date.");
      return;
    }
    await onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Full name *</Label>
          <Input
            id="name"
            value={values.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Amara Okafor"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              value={values.phone}
              onChange={(e) => update({ phone: e.target.value })}
              placeholder="+1 555 010 1234"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="unit">Unit / Room *</Label>
            <Input
              id="unit"
              value={values.unit}
              onChange={(e) => update({ unit: e.target.value })}
              placeholder="A-101"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rent">Monthly rent *</Label>
            <Input
              id="rent"
              type="number"
              min="0"
              step="0.01"
              value={values.monthlyRent}
              onChange={(e) => update({ monthlyRent: e.target.value })}
              placeholder="1200"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              value={values.status}
              onChange={(e) => update({ status: e.target.value as "ACTIVE" | "INACTIVE" })}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="leaseStart">Lease start *</Label>
            <Input
              id="leaseStart"
              type="date"
              value={values.leaseStart}
              onChange={(e) => update({ leaseStart: e.target.value })}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="leaseEnd">Lease end *</Label>
            <Input
              id="leaseEnd"
              type="date"
              value={values.leaseEnd}
              onChange={(e) => update({ leaseEnd: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={values.notes}
            onChange={(e) => update({ notes: e.target.value })}
            placeholder="Optional notes about this tenant"
            rows={2}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
