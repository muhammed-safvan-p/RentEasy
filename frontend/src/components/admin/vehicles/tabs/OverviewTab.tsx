"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Edit, ShieldCheck, User, Copy, Check } from "lucide-react";
import { formatFullDateTime } from "@/lib/formatters";
import { Vehicle } from "@/types";

interface SpecItemProps {
  label: string;
  value: string;
  mono?: boolean;
  valueClass?: string;
  copyable?: boolean;
  onCopy?: () => void;
}

export function SpecItem({
  label,
  value,
  mono = false,
  valueClass = "text-slate-900",
  copyable = false,
  onCopy,
}: SpecItemProps) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold ${valueClass} ${mono ? "font-mono text-xs" : ""}`}>
          {value}
        </span>
        {copyable && onCopy && (
          <button
            onClick={onCopy}
            className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
            title={`Copy ${label}`}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

interface OverviewTabProps {
  vehicle: Vehicle;
  onEditSpecs: () => void;
  onCopy: (text: string, fieldId: string) => void;
  copiedField: string | null;
}

export default function OverviewTab({
  vehicle,
  onEditSpecs,
  onCopy,
  copiedField,
}: OverviewTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Detailed Technical Specs Card */}
      <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Vehicle Specifications & Profile</h3>
          </div>
          <button
            type="button"
            onClick={onEditSpecs}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
            Edit Specs
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <SpecItem label="Vehicle Name" value={vehicle.name} />
          <SpecItem label="Plate Number" value={vehicle.plateNumber} mono />
          <SpecItem label="Fuel Type" value={vehicle.fuelType || "Diesel"} />
          <SpecItem label="Transmission" value={vehicle.transmission || "Manual"} />
          <SpecItem label="Seating Capacity" value={`${vehicle.seatingCapacity || 5} Persons`} />
          <SpecItem
            label="System Status"
            value={vehicle.isActive ? "Active (Operational)" : "Inactive (Deactivated)"}
            valueClass={vehicle.isActive ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}
          />
          <SpecItem label="Registered On" value={formatFullDateTime(vehicle.createdAt)} />
          <SpecItem label="Last Modified" value={formatFullDateTime(vehicle.updatedAt)} />
          <SpecItem
            label="Concurrency Booking Version"
            value={`v${(vehicle as unknown as { bookingVersion?: number }).bookingVersion ?? 0}`}
          />
          <SpecItem
            label="Database ID"
            value={vehicle._id}
            mono
            copyable
            onCopy={() => onCopy(vehicle._id, "spec-id")}
          />
        </div>

        {/* Static Remarks / Notes */}
        <div className="pt-4 border-t border-slate-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Internal Administrative Remarks
          </h4>
          {vehicle.notes ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-700 leading-relaxed">
              {vehicle.notes}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No administrative remarks noted.</p>
          )}
        </div>
      </div>

      {/* Authorized Co-Owners & Stakeholders */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Assigned Co-Owners</h3>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              {vehicle.ownerIds?.length || 0} Users
            </span>
          </div>

          <p className="text-xs text-slate-500 mb-4">
            These users have full manager permissions to view bookings, financial transactions, and availability for this vehicle.
          </p>

          <div className="space-y-3">
            {vehicle.ownerIds && vehicle.ownerIds.length > 0 ? (
              vehicle.ownerIds.map((owner) => {
                const ownerId = typeof owner === "object" && owner?._id ? owner._id : String(owner);
                const username = typeof owner === "object" && owner?.username ? owner.username : "Owner";
                return (
                  <div
                    key={ownerId}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                        {username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{username}</p>
                        <p className="text-[11px] font-mono text-slate-400">ID: {ownerId}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onCopy(ownerId, `owner-${ownerId}`)}
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      title="Copy User ID"
                    >
                      {copiedField === `owner-${ownerId}` ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl">
                <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400 italic">No assigned owners yet.</p>
              </div>
            )}
          </div>
        </div>

        <Link
          href={`/admin/vehicles/${vehicle._id}/edit`}
          className="mt-6 w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold text-center block transition-colors"
        >
          Manage Assigned Owners
        </Link>
      </div>
    </div>
  );
}
