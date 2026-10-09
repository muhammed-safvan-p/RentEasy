"use client";

import React from "react";
import { Plus, FileText, Trash2, Loader2 } from "lucide-react";
import { OperationalNote } from "@/types";
import { formatFullDateTime } from "@/lib/formatters";

interface NotesTabProps {
  operationalNotes?: OperationalNote[];
  onAddNote: () => void;
  onDeleteNote: (noteId: string) => void;
  deletingNoteId: string | null;
}

export default function NotesTab({
  operationalNotes,
  onAddNote,
  onDeleteNote,
  deletingNoteId,
}: NotesTabProps) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Operational Notes & Handover Log</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Keep track of maintenance rules, spare keys, FASTag info, and handover procedures
          </p>
        </div>

        <button
          type="button"
          onClick={onAddNote}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Note
        </button>
      </div>

      {operationalNotes && operationalNotes.length > 0 ? (
        <div className="space-y-3">
          {operationalNotes.map((note) => (
            <div
              key={note._id}
              className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-4"
            >
              <div className="space-y-2">
                <p className="text-sm text-slate-800 leading-relaxed font-medium">{note.text}</p>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>Posted on {formatFullDateTime(note.createdAt)}</span>
                  {note.createdBy?.username && (
                    <>
                      <span>•</span>
                      <span className="font-semibold text-slate-600">By {note.createdBy.username}</span>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDeleteNote(note._id)}
                disabled={deletingNoteId === note._id}
                className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
                title="Delete Note"
              >
                {deletingNoteId === note._id ? (
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
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No operational notes posted yet.</p>
          <p className="text-xs text-slate-400 mt-1">
            Add notes to keep staff and co-owners aligned on operational rules.
          </p>
        </div>
      )}
    </div>
  );
}
