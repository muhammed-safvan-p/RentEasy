"use client";

import React, { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { UserData } from "./AddUserModal";

interface DeleteUserModalProps {
  user: UserData | null;
  onClose: () => void;
  onSuccess: (deletedUserId: string) => void;
}

export default function DeleteUserModal({ user, onClose, onSuccess }: DeleteUserModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;

  const handleDelete = async () => {
    setSubmitting(true);
    setError("");

    try {
      await api.delete(`/api/admin/users/${user._id}`);
      onSuccess(user._id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-user-modal-title"
    >
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
          <Trash2 className="w-6 h-6" />
        </div>

        <div>
          <h3 id="delete-user-modal-title" className="text-lg font-bold text-slate-900">
            Delete User Account
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Are you sure you want to permanently delete the account for{" "}
            <strong className="text-slate-900">{user.username}</strong>?
            {user.vehicleCount ? (
              <span className="block mt-1 text-amber-600 font-medium">
                Note: This user is assigned to {user.vehicleCount} vehicle(s) and will be removed from co-ownership.
              </span>
            ) : null}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Delete User</span>
          </button>
        </div>
      </div>
    </div>
  );
}
