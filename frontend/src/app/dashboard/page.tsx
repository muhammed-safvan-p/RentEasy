"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Car, AlertCircle, Plus, X, Copy, Check } from "lucide-react";
import { useRouter } from "next/navigation";

interface Vehicle {
  _id: string;
  name: string;
  plateNumber: string;
  isActive: boolean;
  totalBookings: number;
  unpaidBookings: number;
}

interface User {
  _id: string;
  username: string;
  role: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showContactModal, setShowContactModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyPhone = async () => {
    try {
      await navigator.clipboard.writeText("9496432072");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
        
        // Fetch user info
        const userRes = await fetch(`${baseUrl}/api/user/me`, { credentials: "include" });
        if (!userRes.ok) {
          if (userRes.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error("Failed to load user info");
        }
        const userData = await userRes.json();
        setUser(userData);

        // Fetch user vehicles
        const vehiclesRes = await fetch(`${baseUrl}/api/user/vehicles`, { credentials: "include" });
        if (!vehiclesRes.ok) throw new Error("Failed to load vehicles");
        const vehiclesData = await vehiclesRes.json();
        setVehicles(vehiclesData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 sticky top-0 z-10 bg-[#0b0b18]/90 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">My Garage</h1>
            <p className="text-sm text-slate-400 mt-1">Manage your vehicles</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowContactModal(true)}
              className="w-10 h-10 rounded-full bg-[#1a1a2e] border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-[#2a2a46] transition-colors"
              aria-label="Add Vehicle"
            >
              <Plus className="w-5 h-5" />
            </button>
            <Link href="/profile">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[2px] cursor-pointer hover:scale-105 transition-transform shadow-lg shadow-indigo-500/20">
                <div className="w-full h-full rounded-full bg-[#12121f] flex items-center justify-center">
                  <span className="text-sm font-medium text-white uppercase">
                    {user ? user.username.charAt(0) : "?"}
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 px-6 flex flex-col mt-2">
        {loading ? (
          <div className="flex flex-col gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#1a1a2e] rounded-3xl p-5 border border-white/5 animate-pulse h-48"></div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center text-center py-10">
            <AlertCircle className="w-12 h-12 text-rose-400 mb-3" />
            <p className="text-rose-400">{error}</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 bg-[#12121f] rounded-3xl border border-white/5 shadow-lg">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
              <Car className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No vehicles found</h3>
            <p className="text-sm text-slate-400 max-w-[250px]">
              You don&apos;t have any vehicles assigned to your account yet.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {vehicles.map((car) => (
              <div key={car._id} className="bg-[#1a1a2e] rounded-3xl p-5 border border-white/5 relative overflow-hidden shadow-lg">
                {/* Ambient Background Glow */}
                <div className={`absolute top-0 right-0 w-32 h-32 blur-[40px] rounded-full -mr-10 -mt-10 pointer-events-none ${car.isActive ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`} />

                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="flex gap-4 items-center">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${car.isActive ? 'bg-indigo-500/10 text-indigo-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      <Car className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{car.name}</h3>
                      <span className="text-xs font-medium text-slate-400 bg-[#0f0f20] px-2 py-1 rounded-md border border-white/5 mt-1 inline-block">
                        {car.plateNumber}
                      </span>
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold tracking-wide ${
                    car.isActive 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${car.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                    {car.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5 relative z-10">
                  <div className="bg-[#12121f] rounded-2xl p-3 border border-white/5">
                    <p className="text-xs text-slate-500 mb-1">Total Bookings</p>
                    <p className="text-lg font-semibold text-white">{car.totalBookings}</p>
                  </div>
                  <div className="bg-[#12121f] rounded-2xl p-3 border border-white/5">
                    <p className="text-xs text-slate-500 mb-1">Unpaid Dues</p>
                    <p className={`text-lg font-semibold ${car.unpaidBookings > 0 ? 'text-amber-400' : 'text-white'}`}>
                      {car.unpaidBookings} <span className="text-xs font-normal text-slate-500 ml-1">bookings</span>
                    </p>
                  </div>
                </div>

                {/* Manage button linking to Vehicle Detail Page */}
                <Link
                  href={`/vehicles/${car._id}`}
                  className="w-full btn-primary rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 relative z-10"
                >
                  Manage {car.name.split(' ')[0]}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#12121f] rounded-3xl p-6 w-full max-w-sm border border-white/10 shadow-2xl relative">
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-2">Add New Vehicle</h3>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              For Adding new vehicle Contact the Developer:
            </p>
            <div className="bg-[#0f0f20] rounded-xl p-4 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Name</span>
                <span className="text-sm font-medium text-white">muhammed safvan</span>
              </div>
              <div className="flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform" onClick={handleCopyPhone}>
                <span className="text-sm text-slate-500">Phone</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">9496432072</span>
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-indigo-400" />
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowContactModal(false)}
              className="w-full mt-6 btn-primary rounded-xl py-2.5 text-sm font-semibold text-white"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
