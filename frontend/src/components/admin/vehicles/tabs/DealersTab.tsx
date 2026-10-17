"use client";

import React from "react";
import { Plus, Building2, Trash2, Loader2 } from "lucide-react";
import { Dealer } from "@/types";

interface DealersTabProps {
  dealers: Dealer[];
  onAddDealer: () => void;
  onDeleteDealer: (dealerId: string) => void;
  deletingDealerId: string | null;
}

export default function DealersTab({
  dealers,
  onAddDealer,
  onDeleteDealer,
  deletingDealerId,
}: DealersTabProps) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Associated Dealer Presets</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Dealers and rental partners configured for fast booking allocation & lock presets
          </p>
        </div>

        <button
          type="button"
          onClick={onAddDealer}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Dealer Preset
        </button>
      </div>

      {dealers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {dealers.map((dealer) => (
            <div
              key={dealer._id}
              className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{dealer.name}</h4>
                  <p className="text-[10px] font-mono text-slate-400">ID: {dealer._id.slice(0, 8)}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDeleteDealer(dealer._id)}
                disabled={deletingDealerId === dealer._id}
                className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                title="Delete Dealer"
              >
                {deletingDealerId === dealer._id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No dealers configured.</p>
          <p className="text-xs text-slate-400 mt-1">Add dealer presets for quick lock assignment.</p>
        </div>
      )}
    </div>
  );
}
