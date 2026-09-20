"use client";

import React from "react";
import { User } from "lucide-react";
import { DealerComboboxInput } from "@/components/dealers/DealerComboboxInput";

interface CustomerDetailsFormProps {
  customerName: string;
  onCustomerNameChange: (name: string) => void;
  vehicleId?: string;
}

export const CustomerDetailsForm: React.FC<CustomerDetailsFormProps> = ({
  customerName,
  onCustomerNameChange,
  vehicleId,
}) => {
  return (
    <section className="bg-[#17172a] border border-white/10 rounded-3xl p-4 shadow-lg space-y-3">
      <div className="flex items-center gap-2 text-slate-400">
        <User className="w-4 h-4 text-indigo-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Customer Information
        </span>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="customerName"
            className="block text-[11px] font-medium text-slate-400"
          >
            Customer Name <span className="text-rose-400">*</span>
          </label>
          <span className="text-[10px] text-slate-500">
            Type name or select dealer
          </span>
        </div>

        <DealerComboboxInput
          id="customerName"
          value={customerName}
          onChange={onCustomerNameChange}
          vehicleId={vehicleId}
          placeholder="e.g. Rahul Sharma or pick dealer"
          required
          autoFocus
        />
      </div>
    </section>
  );
};
