"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";

export default function VehicleBookingsPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="flex flex-col min-h-screen px-6 pt-8 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between pb-6">
        <Link
          href={`/vehicles/${id}`}
          className="w-10 h-10 rounded-full bg-[#1a1a2e] border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-[#2a2a46] transition-colors"
          aria-label="Back to Overview"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Bookings
        </span>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
        <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/10">
          <Calendar className="w-8 h-8 text-indigo-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Bookings Management</h2>
        <p className="text-sm text-slate-400 max-w-xs mb-6">
          The full booking list, scheduling, and management module for this vehicle is coming soon.
        </p>
        <Link
          href={`/vehicles/${id}`}
          className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Overview
        </Link>
      </div>
    </div>
  );
}
