"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Car,
  ShieldAlert,
  AlertCircle,
  Check,
  Copy,
  Calendar,
  CalendarDays,
  TrendingUp,
  Clock,
  Fuel,
  Gauge,
  Users,
  ShieldCheck,
  FileText,
  Sparkles,
  Plus,
  Trash2,
  Loader2,
  X,
} from "lucide-react";

interface Owner {
  _id: string;
  username: string;
  email?: string;
}

interface OperationalNote {
  _id: string;
  text: string;
  createdBy?: {
    _id: string;
    username: string;
  };
  createdAt: string;
}

interface Vehicle {
  _id: string;
  name: string;
  plateNumber: string;
  isActive: boolean;
  notes?: string;
  operationalNotes?: OperationalNote[];
  imageUrl?: string | null;
  ownerIds: Owner[];
  fuelType?: "Petrol" | "Diesel" | "Electric" | "Hybrid" | "CNG";
  transmission?: "Manual" | "Automatic";
  seatingCapacity?: number;
  createdAt: string;
  updatedAt: string;
}

interface VehicleStats {
  totalTrips: number;
  totalRevenue: number;
}

interface CurrentUser {
  _id: string;
  username: string;
  role?: string;
}

export default function VehicleProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [stats, setStats] = useState<VehicleStats | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  // Operational Notes state
  const [showAddNoteForm, setShowAddNoteForm] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [noteError, setNoteError] = useState("");

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const fetchVehicleData = async () => {
      setLoading(true);
      setErrorStatus(null);

      try {
        const [vehicleRes, statsRes, userRes] = await Promise.all([
          fetch(`${baseUrl}/api/vehicles/${id}`, { credentials: "include" }),
          fetch(`${baseUrl}/api/vehicles/${id}/stats`, { credentials: "include" }),
          fetch(`${baseUrl}/api/user/me`, { credentials: "include" }),
        ]);

        if (vehicleRes.status === 401 || statsRes.status === 401) {
          router.push("/login");
          return;
        }

        if (vehicleRes.status === 403 || statsRes.status === 403) {
          if (isMounted) {
            setErrorStatus(403);
            setErrorMessage("You do not have permission to view this vehicle's profile.");
            setLoading(false);
          }
          return;
        }

        if (vehicleRes.status === 404) {
          if (isMounted) {
            setErrorStatus(404);
            setErrorMessage("Vehicle not found.");
            setLoading(false);
          }
          return;
        }

        if (!vehicleRes.ok) throw new Error("Failed to load vehicle profile");

        const vehicleData = await vehicleRes.json();
        const statsData = statsRes.ok ? await statsRes.json() : { totalTrips: 0, totalRevenue: 0 };
        const userData = userRes.ok ? await userRes.json() : null;

        if (isMounted) {
          setVehicle(vehicleData);
          setStats(statsData);
          setCurrentUser(userData);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setErrorStatus(500);
          setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchVehicleData();

    return () => {
      isMounted = false;
    };
  }, [id, baseUrl, router]);

  const handleCopyPlate = () => {
    if (!vehicle?.plateNumber) return;
    navigator.clipboard.writeText(vehicle.plateNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurrency = (amount: number = 0) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatNoteDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFleetAge = (createdAt?: string) => {
    if (!createdAt) return "Recent";
    const start = new Date(createdAt);
    if (isNaN(start.getTime())) return "Recent";
    const now = new Date();
    const diffMonths = Math.max(
      0,
      (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
    );
    if (diffMonths === 0) return "New addition";
    if (diffMonths === 1) return "1 month";
    if (diffMonths < 12) return `${diffMonths} months`;
    const years = Math.floor(diffMonths / 12);
    const remMonths = diffMonths % 12;
    return remMonths > 0 ? `${years}y ${remMonths}m` : `${years} ${years === 1 ? "year" : "years"}`;
  };

  // Add operational note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setNoteError("");

    const trimmed = newNoteText.trim();
    if (!trimmed) {
      setNoteError("Please enter a note before submitting.");
      return;
    }

    setAddingNote(true);

    try {
      const res = await fetch(`${baseUrl}/api/vehicles/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: trimmed }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to add note");
      }

      const data = await res.json();
      if (data.note) {
        setVehicle((prev) =>
          prev
            ? {
                ...prev,
                operationalNotes: [...(prev.operationalNotes || []), data.note],
              }
            : null
        );
      }

      setNewNoteText("");
      setShowAddNoteForm(false);
    } catch (err: unknown) {
      setNoteError(err instanceof Error ? err.message : "Error saving note");
    } finally {
      setAddingNote(false);
    }
  };

  // Delete operational note
  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    setDeletingNoteId(noteId);

    try {
      const res = await fetch(`${baseUrl}/api/vehicles/${id}/notes/${noteId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(errData.message || "Failed to delete note");
        return;
      }

      setVehicle((prev) =>
        prev
          ? {
              ...prev,
              operationalNotes: prev.operationalNotes?.filter((n) => n._id !== noteId),
            }
          : null
      );
    } catch (err) {
      console.error("Error deleting note", err);
      alert("Error deleting note");
    } finally {
      setDeletingNoteId(null);
    }
  };

  // 403 Forbidden State
  if (errorStatus === 403) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center px-6 py-12 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/10">
          <ShieldAlert className="w-8 h-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-sm text-slate-400 max-w-xs mb-6">
          {errorMessage || "You do not have permission to view this vehicle's profile."}
        </p>
        <Link
          href="/dashboard"
          className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Garage
        </Link>
      </div>
    );
  }

  // 404 Not Found State
  if (errorStatus === 404) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center px-6 py-12 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Vehicle Not Found</h2>
        <p className="text-sm text-slate-400 max-w-xs mb-6">
          The requested vehicle does not exist or may have been removed.
        </p>
        <Link
          href="/dashboard"
          className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Garage
        </Link>
      </div>
    );
  }

  // Generic Error State
  if (errorStatus && errorStatus !== 403 && errorStatus !== 404) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center px-6 py-12 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Something Went Wrong</h2>
        <p className="text-sm text-slate-400 max-w-xs mb-6">{errorMessage}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Loading Skeleton
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen px-4 sm:px-6 pt-6 pb-28 space-y-5 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-full bg-[#1a1a2e] animate-pulse" />
          <div className="w-32 h-6 rounded-lg bg-[#1a1a2e] animate-pulse" />
          <div className="w-10 h-10" />
        </div>

        {/* Hero Skeleton */}
        <div className="h-56 rounded-3xl bg-[#1a1a2e] animate-pulse" />

        {/* Stats Skeleton */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="h-20 rounded-2xl bg-[#1a1a2e] animate-pulse" />
          <div className="h-20 rounded-2xl bg-[#1a1a2e] animate-pulse" />
          <div className="h-20 rounded-2xl bg-[#1a1a2e] animate-pulse" />
        </div>

        {/* Specs Skeleton */}
        <div className="h-36 rounded-3xl bg-[#1a1a2e] animate-pulse" />

        {/* Owners Skeleton */}
        <div className="h-28 rounded-3xl bg-[#1a1a2e] animate-pulse" />
      </div>
    );
  }

  const isVehicleActive = vehicle?.isActive ?? true;
  const operationalNotes = vehicle?.operationalNotes || [];

  return (
    <div className="flex flex-col min-h-screen px-4 sm:px-6 pt-6 pb-28 max-w-lg mx-auto w-full">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4">
        <Link
          href={`/vehicles/${id}`}
          className="w-10 h-10 rounded-full bg-[#1a1a2e] border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-[#2a2a46] transition-colors"
          aria-label="Back to Overview"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="text-center">
          <h1 className="text-sm font-semibold text-white tracking-wide">Vehicle Details</h1>
          <p className="text-[11px] text-slate-400 font-medium">Specifications & Profile</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="space-y-4">
        {/* 1. Hero Showcase Card */}
        <div className="bg-[#1a1a2e] rounded-3xl border border-white/10 overflow-hidden shadow-2xl relative">
          {/* Image or Premium Illustration Banner */}
          <div className="relative aspect-[16/10] sm:aspect-video w-full overflow-hidden bg-gradient-to-br from-[#121224] via-[#1a1a36] to-[#0f0f20] flex items-center justify-center">
            {vehicle?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={vehicle.imageUrl}
                alt={vehicle.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 py-8">
                <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-2 shadow-lg shadow-indigo-500/10">
                  <Car className="w-10 h-10 text-indigo-400" />
                </div>
                <span className="text-xs text-slate-400 font-medium tracking-wide">
                  RentEasy Fleet Vehicle
                </span>
              </div>
            )}

            {/* Availability Status Chip */}
            <div className="absolute top-3 right-3 z-10">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border shadow-lg ${
                  isVehicleActive
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isVehicleActive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                  }`}
                />
                {isVehicleActive ? "Active Fleet" : "Inactive"}
              </span>
            </div>
          </div>

          {/* Vehicle Name & Plate Info Container */}
          <div className="p-5">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-3">
              {vehicle?.name}
            </h2>

            {/* Realistic Indian HSRP Plate */}
            <div className="inline-flex items-center bg-slate-100 rounded-lg border-2 border-slate-300 shadow-md overflow-hidden select-all">
              {/* Blue IND Left Band */}
              <div className="bg-[#002244] px-2 py-1.5 flex flex-col items-center justify-center text-white border-r border-blue-900">
                <div className="w-2.5 h-2.5 rounded-full border border-yellow-400 mb-0.5 flex items-center justify-center">
                  <div className="w-1 h-1 bg-yellow-400 rounded-full" />
                </div>
                <span className="text-[9px] font-black tracking-tighter leading-none text-blue-100">
                  IND
                </span>
              </div>

              {/* Embossed Plate Number Text */}
              <div className="px-3.5 py-1 font-mono font-black text-slate-900 text-sm sm:text-base tracking-widest uppercase">
                {vehicle?.plateNumber}
              </div>

              {/* Copy Button */}
              <button
                onClick={handleCopyPlate}
                className="px-2.5 py-2 hover:bg-slate-200 text-slate-600 transition-colors border-l border-slate-300 flex items-center justify-center"
                title="Copy Plate Number"
                aria-label="Copy Plate Number"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 2. Lifetime Quick Stats */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Total Completed Trips */}
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-3 flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
              <CalendarDays className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-medium">Trips</span>
            </div>
            <span className="text-lg font-black text-white">
              {stats?.totalTrips ?? 0}
            </span>
          </div>

          {/* Lifetime Revenue */}
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-3 flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-medium">Earnings</span>
            </div>
            <span className="text-base sm:text-lg font-black text-emerald-400 truncate">
              {formatCurrency(stats?.totalRevenue ?? 0)}
            </span>
          </div>

          {/* Fleet Age */}
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-3 flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-medium">In Fleet</span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-white truncate">
              {getFleetAge(vehicle?.createdAt)}
            </span>
          </div>
        </div>

        {/* 3. Specifications Card */}
        <div className="bg-[#1a1a2e] border border-white/10 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Vehicle Specifications
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Fuel Type */}
            <div className="bg-black/20 rounded-2xl p-3 border border-white/5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <Fuel className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  Fuel Type
                </p>
                <p className="text-xs sm:text-sm font-bold text-white truncate">
                  {vehicle?.fuelType || "Diesel"}
                </p>
              </div>
            </div>

            {/* Transmission */}
            <div className="bg-black/20 rounded-2xl p-3 border border-white/5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                <Gauge className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  Transmission
                </p>
                <p className="text-xs sm:text-sm font-bold text-white truncate">
                  {vehicle?.transmission || "Manual"}
                </p>
              </div>
            </div>

            {/* Seating Capacity */}
            <div className="bg-black/20 rounded-2xl p-3 border border-white/5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  Capacity
                </p>
                <p className="text-xs sm:text-sm font-bold text-white truncate">
                  {vehicle?.seatingCapacity || 5} Seater
                </p>
              </div>
            </div>

            {/* Registered On */}
            <div className="bg-black/20 rounded-2xl p-3 border border-white/5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  Added On
                </p>
                <p className="text-xs sm:text-sm font-bold text-white truncate">
                  {formatDate(vehicle?.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Authorized Co-Owners */}
        <div className="bg-[#1a1a2e] border border-white/10 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Authorized Owners
            </h3>
          </div>

          <p className="text-xs text-slate-400 mb-3">
            These accounts have full access to view bookings, financial transactions, and calendar status for this vehicle.
          </p>

          <div className="space-y-2">
            {vehicle?.ownerIds && vehicle.ownerIds.length > 0 ? (
              vehicle.ownerIds.map((owner, idx) => (
                <div
                  key={owner._id || idx}
                  className="bg-black/20 rounded-2xl p-3 border border-white/5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md">
                      {owner.username ? owner.username.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {owner.username || "Authorized User"}
                      </p>
                      {owner.email && (
                        <p className="text-[11px] text-slate-400 truncate">{owner.email}</p>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 shrink-0">
                    Owner
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">No assigned owners listed.</p>
            )}
          </div>
        </div>

        {/* 5. Operational Notes & Instructions */}
        <div className="bg-[#1a1a2e] border border-white/10 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Operational Notes
              </h3>
            </div>

            {!showAddNoteForm && (
              <button
                onClick={() => {
                  setShowAddNoteForm(true);
                  setNoteError("");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-semibold hover:bg-amber-500/25 transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Note</span>
              </button>
            )}
          </div>

          <p className="text-xs text-slate-400 mb-4">
            Keep track of maintenance rules, spare key locations, Fastag info, or handover instructions.
          </p>

          {/* Add Note Form */}
          {showAddNoteForm && (
            <form onSubmit={handleAddNote} className="mb-4 p-4 rounded-2xl bg-[#121224] border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  New Operational Note
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddNoteForm(false)}
                  className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {noteError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{noteError}</span>
                </div>
              )}

              <textarea
                required
                rows={3}
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="e.g. Spare key is located in the glovebox; Fastag tag linked to ICICI account..."
                className="w-full bg-[#181830] border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors resize-none"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddNoteForm(false)}
                  disabled={addingNote}
                  className="px-3.5 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingNote}
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/25 disabled:opacity-50 transition-all"
                >
                  {addingNote ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Note</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Notes List */}
          <div className="space-y-3">
            {/* Legacy note if present */}
            {vehicle?.notes && (
              <div className="bg-black/20 rounded-2xl p-3.5 border border-white/5 relative">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1.5">
                  <span>General Overview Note</span>
                </div>
                <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {vehicle.notes}
                </p>
              </div>
            )}

            {/* Operational Notes entries (newest first) */}
            {operationalNotes.length > 0 ? (
              [...operationalNotes].reverse().map((note) => {
                const authorUsername =
                  typeof note.createdBy === "object" && note.createdBy?.username
                    ? note.createdBy.username
                    : "Owner";
                const authorId =
                  typeof note.createdBy === "object" && note.createdBy?._id
                    ? note.createdBy._id
                    : typeof note.createdBy === "string"
                    ? note.createdBy
                    : "";

                const canDelete =
                  currentUser &&
                  (authorId === currentUser._id || currentUser.role === "admin");

                const isDeleting = deletingNoteId === note._id;

                return (
                  <div
                    key={note._id}
                    className="bg-black/20 rounded-2xl p-3.5 border border-white/5 space-y-2 transition-colors hover:border-white/10"
                  >
                    <p className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
                      {note.text}
                    </p>

                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/5 text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-300">
                          Added by {authorUsername}
                        </span>
                        <span>•</span>
                        <span className="text-slate-500">
                          {formatNoteDate(note.createdAt)}
                        </span>
                      </div>

                      {canDelete && (
                        <button
                          onClick={() => handleDeleteNote(note._id)}
                          disabled={isDeleting}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete your note"
                          aria-label="Delete note"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : !vehicle?.notes ? (
              <div className="bg-black/20 rounded-2xl p-6 border border-white/5 text-center">
                <p className="text-xs text-slate-400 mb-2">
                  No operational notes recorded yet.
                </p>
                <button
                  onClick={() => setShowAddNoteForm(true)}
                  className="text-xs text-amber-400 hover:underline font-semibold"
                >
                  + Add the first note
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
