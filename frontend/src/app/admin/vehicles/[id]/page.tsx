"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Car, ArrowLeft, User, Edit } from "lucide-react";

interface Owner {
  _id: string;
  username: string;
}

interface Vehicle {
  _id: string;
  name: string;
  plateNumber: string;
  isActive: boolean;
  ownerIds: Owner[];
  imageUrl: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface WalletTransaction {
  _id: string;
  type: "income" | "expense";
  paymentMethod: "cash" | "bank";
  amount: number;
  note: string;
  source: string;
  createdAt: string;
}

interface Wallet {
  cashBalance: number;
  bankBalance: number;
  totalBalance: number;
}

export default function VehicleDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

  useEffect(() => {
    if (!id) return;
    const fetch_ = async () => {
      try {
        const vehicleRes = await fetch(`${baseUrl}/api/admin/vehicles/${id}`, {
          credentials: "include",
        });
        if (!vehicleRes.ok) throw new Error("Vehicle not found");
        const vehicleData = await vehicleRes.json();
        setVehicle(vehicleData);

        const [walletRes, txRes] = await Promise.all([
          fetch(`${baseUrl}/api/vehicles/${id}/wallet`, { credentials: "include" }),
          fetch(`${baseUrl}/api/vehicles/${id}/wallet/transactions`, { credentials: "include" }),
        ]);
        if (walletRes.ok) {
          const walletData = await walletRes.json();
          setWallet(walletData.wallet || walletData);
        }
        if (txRes.ok) {
          const txData = await txRes.json();
          setTransactions(txData.transactions || []);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error loading vehicle");
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [id, baseUrl]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-slate-100 rounded" />
        <div className="h-64 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <p className="text-rose-500 font-medium mb-4">{error || "Vehicle not found"}</p>
        <button
          onClick={() => router.back()}
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Go back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Vehicles
      </button>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header Band */}
        <div className="bg-slate-50 border-b border-slate-200 px-8 py-6 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-500 flex items-center justify-center shrink-0">
            <Car className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{vehicle.name}</h2>
            <span className="font-mono text-slate-500 text-sm tracking-widest bg-slate-200 px-2 py-0.5 rounded mt-1 inline-block">
              {vehicle.plateNumber}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Link
              href={`/admin/vehicles/${vehicle._id}/edit`}
              className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit
            </Link>
            <span
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                vehicle.isActive
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              {vehicle.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="p-8 grid grid-cols-2 gap-6">
          <DetailRow label="Vehicle Name" value={vehicle.name} />
          <DetailRow label="Plate Number" value={vehicle.plateNumber} mono />
          <DetailRow
            label="Status"
            value={vehicle.isActive ? "Active" : "Inactive"}
            valueClass={vehicle.isActive ? "text-emerald-600" : "text-slate-400"}
          />
          <DetailRow
            label="Registered On"
            value={new Date(vehicle.createdAt).toLocaleDateString("en-IN", {
              day: "numeric", month: "long", year: "numeric",
            })}
          />
          <div className="col-span-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Owners
            </p>
            {vehicle.ownerIds && vehicle.ownerIds.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {vehicle.ownerIds.map((owner) => (
                  <span
                    key={owner._id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm"
                  >
                    <User className="w-3.5 h-3.5" />
                    {owner.username}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-slate-400 italic text-sm">No owners assigned</span>
            )}
          </div>
          {vehicle.notes && (
            <div className="col-span-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Notes
              </p>
              <p className="text-slate-600 text-sm bg-slate-50 rounded-xl p-4 border border-slate-100">
                {vehicle.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Wallet Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
        <div className="bg-slate-50 border-b border-slate-200 px-8 py-5">
          <h3 className="text-lg font-bold text-slate-800">Wallet Details</h3>
        </div>
        <div className="p-8">
          {wallet ? (
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
                <p className="text-indigo-600 text-sm font-semibold uppercase tracking-wider mb-1">Total Balance</p>
                <p className="text-3xl font-bold text-indigo-900">₹{wallet.totalBalance.toFixed(2)}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6">
                <p className="text-emerald-600 text-sm font-semibold uppercase tracking-wider mb-1">Cash Balance</p>
                <p className="text-3xl font-bold text-emerald-900">₹{wallet.cashBalance.toFixed(2)}</p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
                <p className="text-blue-600 text-sm font-semibold uppercase tracking-wider mb-1">Bank Balance</p>
                <p className="text-3xl font-bold text-blue-900">₹{wallet.bankBalance.toFixed(2)}</p>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 italic mb-8">Wallet information not available.</p>
          )}

          <div>
            <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4 border-b pb-2">Recent Transactions</h4>
            {transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div key={tx._id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-800">{tx.note || "No note"}</span>
                      <span className="text-xs text-slate-500 mt-1">
                        {new Date(tx.createdAt).toLocaleString("en-IN")} • {tx.source} • {tx.paymentMethod}
                      </span>
                    </div>
                    <div className={`font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 italic text-sm">No transactions yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
  valueClass = "text-slate-800",
}: {
  label: string;
  value: string;
  mono?: boolean;
  valueClass?: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className={`text-sm font-medium ${valueClass} ${mono ? "font-mono tracking-wider" : ""}`}>
        {value}
      </p>
    </div>
  );
}
