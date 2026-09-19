"use client";

import React from "react";
import { User } from "lucide-react";

interface CustomerDetailsFormProps {
  customerName: string;
  onCustomerNameChange: (name: string) => void;
}

export const CustomerDetailsForm: React.FC<CustomerDetailsFormProps> = ({
  customerName,
  onCustomerNameChange,
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
        <label
          htmlFor="customerName"
          className="block text-[11px] font-medium text-slate-400 mb-1.5"
        >
          Customer Name <span className="text-rose-400">*</span>
        </label>
        <input
          id="customerName"
          type="text"
          required
          autoFocus
          value={customerName}
          onChange={(e) => onCustomerNameChange(e.target.value)}
          placeholder="e.g. Rahul Sharma"
          className="w-full bg-[#101020] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
        />
      </div>
    </section>
  );
};
