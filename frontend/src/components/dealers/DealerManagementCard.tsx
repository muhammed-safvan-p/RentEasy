"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { Dealer } from "@/types";
import {
  Briefcase,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  AlertCircle,
  Building2,
} from "lucide-react";

interface DealerManagementCardProps {
  vehicleId: string;
}

export function DealerManagementCard({ vehicleId }: DealerManagementCardProps) {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete confirm state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDealers = useCallback(async () => {
    if (!vehicleId) return;
    try {
      const data = await api.get<{ dealers: Dealer[] }>(`/api/vehicles/${vehicleId}/dealers`);
      setDealers(data.dealers || []);
    } catch (err: unknown) {
      logger.error("Failed to load dealers:", err);
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDealers();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchDealers]);

  // Handle Add Dealer
  const handleAddDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const trimmed = newName.trim();
    if (!trimmed) {
      setFormError("Dealer name is required");
      return;
    }

    setAdding(true);
    try {
      const data = await api.post<{ dealer: Dealer }>(`/api/vehicles/${vehicleId}/dealers`, {
        name: trimmed,
      });

      setDealers((prev) => {
        const updated = [...prev, data.dealer];
        return updated.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "accent" }));
      });
      setNewName("");
      setShowAddForm(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error creating dealer");
    } finally {
      setAdding(false);
    }
  };

  // Handle Edit Dealer
  const startEdit = (dealer: Dealer) => {
    setEditingId(dealer._id);
    setEditName(dealer.name);
    setEditError("");
    setDeleteConfirmId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditError("");
  };

  const handleSaveEdit = async (dealerId: string) => {
    setEditError("");
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError("Dealer name cannot be empty");
      return;
    }

    setSavingEdit(true);
    try {
      const data = await api.patch<{ dealer: Dealer }>(`/api/vehicles/${vehicleId}/dealers/${dealerId}`, {
        name: trimmed,
      });

      setDealers((prev) =>
        prev
          .map((d) => (d._id === dealerId ? data.dealer : d))
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "accent" }))
      );
      setEditingId(null);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Error updating dealer");
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle Delete Dealer
  const handleDelete = async (dealerId: string) => {
    setDeletingId(dealerId);
    try {
      await api.delete(`/api/vehicles/${vehicleId}/dealers/${dealerId}`);
      setDealers((prev) => prev.filter((d) => d._id !== dealerId));
      setDeleteConfirmId(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete dealer");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-[#1a1a2e] border border-white/10 rounded-3xl p-5 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400">
            <Briefcase className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Dealers
            </h3>
            {dealers.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20 font-semibold">
                {dealers.length}
              </span>
            )}
          </div>
        </div>

        {!showAddForm && (
          <button
            type="button"
            onClick={() => {
              setShowAddForm(true);
              setFormError("");
              setDeleteConfirmId(null);
              setEditingId(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/15 text-violet-300 border border-violet-500/30 text-xs font-semibold hover:bg-violet-500/25 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Dealer</span>
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400 mb-4">
        Saved recurring dealers or brokers for this vehicle to quickly autocomplete customer names when booking.
      </p>

      {/* Add Dealer Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddDealer}
          className="mb-4 bg-black/40 border border-violet-500/30 rounded-2xl p-4 space-y-3 animate-fadeIn"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-violet-300 uppercase tracking-wide">
              New Dealer
            </span>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewName("");
                setFormError("");
              }}
              className="text-slate-400 hover:text-white text-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <input
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setFormError("");
              }}
              placeholder="e.g. Royal Motors, Highway Travels"
              autoFocus
              className="w-full bg-black/40 border border-white/10 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-all"
            />
          </div>

          {formError && (
            <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex justify-end items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewName("");
                setFormError("");
              }}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adding || !newName.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-xs font-semibold text-white shadow-lg shadow-violet-600/20 transition-all active:scale-95"
            >
              {adding ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Dealer</span>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Dealers List */}
      {loading ? (
        <div className="py-6 flex items-center justify-center gap-2 text-slate-400 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
          <span>Loading dealers...</span>
        </div>
      ) : dealers.length === 0 ? (
        <div className="bg-black/20 rounded-2xl p-6 border border-white/5 text-center">
          <Building2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-xs text-slate-400 font-medium">No dealers saved yet.</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Click &quot;+ Add Dealer&quot; to save regular dealers or brokers for this vehicle.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {dealers.map((dealer) => {
            const isEditing = editingId === dealer._id;
            const isDeleting = deletingId === dealer._id;
            const isConfirmingDelete = deleteConfirmId === dealer._id;

            return (
              <div
                key={dealer._id}
                className="bg-black/20 rounded-2xl p-3 border border-white/5 flex flex-col gap-2 hover:border-white/10 transition-colors"
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => {
                          setEditName(e.target.value);
                          setEditError("");
                        }}
                        autoFocus
                        className="flex-1 bg-black/40 border border-violet-500/50 rounded-xl px-3 py-1.5 text-sm text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(dealer._id)}
                        disabled={savingEdit || !editName.trim()}
                        className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 disabled:opacity-50 transition-colors"
                        title="Save Changes"
                      >
                        {savingEdit ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={savingEdit}
                        className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {editError && (
                      <p className="text-[11px] text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {editError}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                        {dealer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {dealer.name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 rounded-xl px-2.5 py-1">
                          <span className="text-[11px] text-rose-300 font-medium">Delete?</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(dealer._id)}
                            disabled={isDeleting}
                            className="text-[11px] font-bold text-rose-400 hover:text-rose-300 underline underline-offset-2 ml-1"
                          >
                            {isDeleting ? "..." : "Yes"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-slate-400 hover:text-white ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(dealer)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-violet-300 hover:bg-violet-500/10 transition-colors"
                            title="Edit Dealer Name"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteConfirmId(dealer._id);
                              setEditingId(null);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete Dealer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
