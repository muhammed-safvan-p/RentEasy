"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SafeImage } from "@/components/common/SafeImage";
import { api, ApiError } from "@/lib/api";
import { formatCurrency, formatFullDateTime, formatDateNice } from "@/lib/formatters";
import { ErrorBanner } from "@/components/common/ErrorBanner";
import {
  ArrowLeft,
  Car,
  ShieldAlert,
  AlertCircle,
  Check,
  Copy,
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
  Pencil,
  Share2,
  Maximize2,
  ChevronRight,
} from "lucide-react";
import { Vehicle, OperationalNote } from "@/types";
import { DealerManagementCard } from "@/components/dealers/DealerManagementCard";
import { EditVehicleSheet, TabType } from "@/components/vehicles/EditVehicleSheet";
import { logger } from "@/lib/logger";

interface VehicleStats {
  totalTrips: number;
  totalRevenue: number;
}

interface CurrentUser {
  _id: string;
  username: string;
  role?: string;
}

const NOTE_TEMPLATES = [
  { label: "🔑 Spare Key", text: "Spare key is kept in " },
  { label: "🏷️ Fastag", text: "Fastag is linked to " },
  { label: "🛢️ Service Due", text: "Next oil service due at " },
  { label: "📄 Insurance/RC", text: "RC / Insurance renewal due on " },
];

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
  const [shareNotice, setShareNotice] = useState("");

  // Operational Notes state
  const [showAddNoteForm, setShowAddNoteForm] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] = useState<string | null>(null);
  const [noteError, setNoteError] = useState("");

  // Edit vehicle sheet state
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [editInitialTab, setEditInitialTab] = useState<TabType>("specs");

  // Image Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const fetchVehicleData = async () => {
      setLoading(true);
      setErrorStatus(null);

      try {
        const [vehicleData, statsData, userData] = await Promise.all([
          api.get<Vehicle>(`/api/vehicles/${id}`),
          api.get<VehicleStats>(`/api/vehicles/${id}/stats`).catch(() => ({ totalTrips: 0, totalRevenue: 0 })),
          api.get<CurrentUser>(`/api/user/me`).catch(() => null),
        ]);

        if (isMounted) {
          setVehicle(vehicleData);
          setStats(statsData);
          setCurrentUser(userData);
        }
      } catch (err: unknown) {
        const apiErr = err as ApiError;
        if (apiErr.status === 401) {
          router.push("/login");
          return;
        }
        if (isMounted) {
          if (apiErr.status === 403) {
            setErrorStatus(403);
            setErrorMessage("You do not have permission to view this vehicle's profile.");
          } else if (apiErr.status === 404) {
            setErrorStatus(404);
            setErrorMessage("Vehicle not found.");
          } else {
            setErrorStatus(500);
            setErrorMessage(apiErr.message || "An unexpected error occurred");
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchVehicleData();

    return () => {
      isMounted = false;
    };
  }, [id, router]);

  const canEdit = useMemo(() => {
    if (!currentUser || !vehicle) return false;
    if (currentUser.role === "admin") return true;
    return vehicle.ownerIds?.some((o) => (typeof o === "object" ? o._id : o) === currentUser._id);
  }, [currentUser, vehicle]);

  const handleOpenEdit = (tab: TabType = "specs") => {
    setEditInitialTab(tab);
    setShowEditSheet(true);
  };

  const handleCopyPlate = () => {
    if (!vehicle?.plateNumber) return;
    navigator.clipboard.writeText(vehicle.plateNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareVehicle = async () => {
    if (!vehicle) return;
    const fuel = vehicle.fuelType || "Diesel";
    const transmission = vehicle.transmission || "Manual";
    const seats = vehicle.seatingCapacity || 5;

    const summary = [
      `🚗 *${vehicle.name}*`,
      `📋 Registration: ${vehicle.plateNumber}`,
      `🛢️ Fuel: ${fuel} | 🕹️ Transmission: ${transmission}`,
      `👥 Capacity: ${seats} Seater`,
      vehicle.notes ? `📝 Note: ${vehicle.notes}` : "",
      `— RentEasy Garage`,
    ]
      .filter(Boolean)
      .join("\n");

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${vehicle.name} (${vehicle.plateNumber})`,
          text: summary,
        });
        return;
      } catch {
        // User dismissed share dialog; fallback to clipboard copy
      }
    }

    try {
      await navigator.clipboard.writeText(summary);
      setShareNotice("Vehicle summary copied to clipboard!");
      setTimeout(() => setShareNotice(""), 3000);
    } catch {
      setShareNotice("Failed to copy summary");
      setTimeout(() => setShareNotice(""), 3000);
    }
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
      const data = await api.post<{ note: OperationalNote }>(`/api/vehicles/${id}/notes`, {
        text: trimmed,
      });

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

  // Delete operational note with inline confirmation
  const handleExecuteDeleteNote = async (noteId: string) => {
    setDeletingNoteId(noteId);
    setConfirmDeleteNoteId(null);

    try {
      await api.delete(`/api/vehicles/${id}/notes/${noteId}`);
      setVehicle((prev) =>
        prev
          ? {
              ...prev,
              operationalNotes: prev.operationalNotes?.filter((n) => n._id !== noteId),
            }
          : null
      );
    } catch (err: unknown) {
      logger.error("Error deleting note", err);
      alert(err instanceof Error ? err.message : "Error deleting note");
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
    <div className="flex flex-col min-h-screen px-4 sm:px-6 pt-6 pb-36 max-w-lg mx-auto w-full relative text-slate-100">
      {/* Toast Notification Banner */}
      {shareNotice && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200">
          <Check className="w-4 h-4" />
          <span>{shareNotice}</span>
        </div>
      )}

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

        <div className="flex items-center gap-2">
          {/* Share Button */}
          <button
            onClick={handleShareVehicle}
            className="w-10 h-10 rounded-full bg-[#1a1a2e] border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-[#2a2a46] transition-colors cursor-pointer"
            title="Share Vehicle Summary"
            aria-label="Share Vehicle Summary"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Edit Button */}
          {canEdit && (
            <button
              onClick={() => handleOpenEdit("specs")}
              className="w-10 h-10 rounded-full bg-[#1a1a2e] border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-[#2a2a46] transition-colors cursor-pointer"
              aria-label="Edit Vehicle"
              title="Edit Vehicle"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* 1. Hero Showcase Card */}
        <div className="bg-[#1a1a2e] rounded-3xl border border-white/10 overflow-hidden shadow-2xl relative">
          {/* Image or Banner */}
          <div
            onClick={() => vehicle?.imageUrl && setLightboxOpen(true)}
            className={`relative aspect-[16/10] sm:aspect-video w-full overflow-hidden bg-gradient-to-br from-[#121224] via-[#1a1a36] to-[#0f0f20] flex items-center justify-center ${
              vehicle?.imageUrl ? "cursor-pointer group" : ""
            }`}
          >
            {vehicle?.imageUrl ? (
              <>
                <SafeImage
                  src={vehicle.imageUrl}
                  alt={vehicle.name}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 512px"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10 text-[10px] font-semibold text-slate-200 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-3 h-3 text-indigo-400" />
                  <span>Tap to view</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 py-8">
                <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-2 shadow-lg shadow-indigo-500/10">
                  <Car className="w-10 h-10 text-indigo-400" />
                </div>
                <span className="text-xs text-slate-400 font-medium tracking-wide">
                  RentEasy Garage Vehicle
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
                {isVehicleActive ? "In Garage" : "Inactive"}
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
                className="px-2.5 py-2 hover:bg-slate-200 text-slate-600 transition-colors border-l border-slate-300 flex items-center justify-center cursor-pointer"
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

        {/* 2. Interactive Lifetime Quick Stats (Jump to Calendar / Wallet) */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Total Completed Trips -> Links to Calendar */}
          <Link
            href={`/vehicles/${id}`}
            className="bg-[#1a1a2e] border border-white/10 hover:border-indigo-500/40 hover:bg-[#20203a] rounded-2xl p-3 flex flex-col justify-between shadow-sm transition-all cursor-pointer group"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="font-medium">Bookings</span>
                </span>
                <ChevronRight className="w-3 h-3 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <span className="text-lg font-black text-white">
                {stats?.totalTrips ?? 0}
              </span>
            </div>
            <span className="text-[10px] text-indigo-400 font-medium pt-1">
              View Calendar →
            </span>
          </Link>

          {/* Lifetime Revenue -> Links to Wallet */}
          <Link
            href={`/vehicles/${id}/wallet`}
            className="bg-[#1a1a2e] border border-white/10 hover:border-emerald-500/40 hover:bg-[#20203a] rounded-2xl p-3 flex flex-col justify-between shadow-sm transition-all cursor-pointer group"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-medium">Revenue</span>
                </span>
                <ChevronRight className="w-3 h-3 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <span className="text-base sm:text-lg font-black text-emerald-400 truncate">
                {formatCurrency(stats?.totalRevenue ?? 0)}
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 font-medium pt-1">
              View Ledger →
            </span>
          </Link>

          {/* In Garage Date */}
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-3 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-medium">In Garage</span>
              </div>
              <span className="text-xs sm:text-sm font-bold text-white truncate">
                {formatDateNice(vehicle?.createdAt)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium pt-1">
              Fleet Entry
            </span>
          </div>
        </div>

        {/* 3. Specifications Card (with contextual Edit) */}
        <div className="bg-[#1a1a2e] border border-white/10 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Specifications
              </h3>
            </div>

            {canEdit && (
              <button
                type="button"
                onClick={() => handleOpenEdit("specs")}
                className="px-2.5 py-1 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Pencil className="w-3 h-3" />
                <span>Edit Specs</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {/* Fuel Type */}
            <div className="bg-black/20 rounded-2xl p-3 border border-white/5 flex flex-col justify-between">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 mb-2">
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
            <div className="bg-black/20 rounded-2xl p-3 border border-white/5 flex flex-col justify-between">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 mb-2">
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
            <div className="bg-black/20 rounded-2xl p-3 border border-white/5 flex flex-col justify-between">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 mb-2">
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
          </div>
        </div>

        {/* 4. Authorized Co-Owners (with contextual Manage Access) */}
        <div className="bg-[#1a1a2e] border border-white/10 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                People who have access
              </h3>
            </div>

            {canEdit && (
              <button
                type="button"
                onClick={() => handleOpenEdit("access")}
                className="px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Users className="w-3 h-3" />
                <span>Manage Team</span>
              </button>
            )}
          </div>

          <p className="text-xs text-slate-400 mb-3">
            Authorized accounts have permission to view bookings, financial transactions, and calendar status.
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
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-white truncate">
                          {owner.username || "Authorized User"}
                        </p>
                        {currentUser && (owner._id || owner) === currentUser._id && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                            You
                          </span>
                        )}
                      </div>
                      {owner.email && (
                        <p className="text-[11px] text-slate-400 truncate">{owner.email}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">No assigned owners listed.</p>
            )}
          </div>
        </div>

        {/* Dealer Presets */}
        <DealerManagementCard vehicleId={id} />

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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-semibold hover:bg-amber-500/25 transition-all active:scale-95 cursor-pointer"
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
                  className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Starter template chips */}
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-400">
                  Quick Starter Chips:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {NOTE_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.label}
                      type="button"
                      onClick={() =>
                        setNewNoteText((prev) => (prev ? `${prev} | ${tmpl.text}` : tmpl.text))
                      }
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-amber-500/15 text-slate-300 hover:text-amber-300 border border-white/10 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      {tmpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {noteError && (
                <ErrorBanner message={noteError} onDismiss={() => setNoteError("")} />
              )}

              <textarea
                required
                rows={3}
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="e.g. Spare key is located in glovebox; Fastag linked to ICICI account..."
                className="w-full bg-[#181830] border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors resize-none"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddNoteForm(false)}
                  disabled={addingNote}
                  className="px-3.5 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingNote}
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/25 disabled:opacity-50 transition-all cursor-pointer"
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
                          {formatFullDateTime(note.createdAt)}
                        </span>
                      </div>

                      {canDelete && (
                        <button
                          onClick={() => setConfirmDeleteNoteId(note._id)}
                          disabled={isDeleting}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete note"
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
                  className="text-xs text-amber-400 hover:underline font-semibold cursor-pointer"
                >
                  + Add the first note
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Floating Bottom Quick Actions Pill */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 w-full max-w-sm px-4">
        <div className="bg-[#121224]/90 backdrop-blur-xl border border-white/15 rounded-full p-1.5 shadow-2xl flex items-center justify-between text-xs font-semibold text-slate-300">
          <Link
            href={`/vehicles/${id}`}
            className="flex-1 py-2 px-2 rounded-full flex items-center justify-center gap-1.5 hover:bg-white/10 hover:text-white transition-all text-center"
          >
            <CalendarDays className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">Calendar</span>
          </Link>
          <Link
            href={`/vehicles/${id}/wallet`}
            className="flex-1 py-2 px-2 rounded-full flex items-center justify-center gap-1.5 hover:bg-white/10 hover:text-white transition-all text-center"
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Wallet</span>
          </Link>
          {canEdit && (
            <button
              onClick={() => handleOpenEdit("specs")}
              className="flex-1 py-2 px-3 rounded-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 shrink-0" />
              <span>Edit</span>
            </button>
          )}
          <button
            onClick={handleShareVehicle}
            className="py-2 px-3 rounded-full flex items-center justify-center hover:bg-white/10 hover:text-white transition-all cursor-pointer shrink-0"
            title="Share vehicle card"
            aria-label="Share vehicle summary"
          >
            <Share2 className="w-3.5 h-3.5 text-amber-400" />
          </button>
        </div>
      </div>

      {/* Modern In-App Note Deletion Confirmation Dialog */}
      {confirmDeleteNoteId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#1c1c36] border border-white/15 rounded-2xl p-5 max-w-xs w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">
                Delete Operational Note?
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Are you sure you want to delete this note? This action cannot be undone.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDeleteNoteId(null)}
                className="py-2 px-3 rounded-xl border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleExecuteDeleteNote(confirmDeleteNoteId)}
                className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition-colors shadow-md shadow-rose-600/30 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {lightboxOpen && vehicle?.imageUrl && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-zoom-out"
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close photo preview"
          >
            <X className="w-5 h-5" />
          </button>
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full max-h-[85vh] aspect-video rounded-3xl overflow-hidden border border-white/15 shadow-2xl"
          >
            <SafeImage
              src={vehicle.imageUrl}
              alt={vehicle.name}
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        </div>
      )}

      {/* Edit Vehicle Bottom Sheet */}
      <EditVehicleSheet
        isOpen={showEditSheet}
        onClose={() => setShowEditSheet(false)}
        vehicle={vehicle}
        currentUser={currentUser}
        initialTab={editInitialTab}
        onSuccess={(updated) => {
          setVehicle(updated);
        }}
      />
    </div>
  );
}
