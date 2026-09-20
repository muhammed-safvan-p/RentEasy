"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { API_BASE_URL as baseUrl } from "@/lib/api";
import { Dealer } from "@/types";
import {
  Building2,
  ChevronDown,
  Plus,
  Check,
  Loader2,
  X,
  Sparkles,
} from "lucide-react";

interface DealerComboboxInputProps {
  value: string;
  onChange: (value: string) => void;
  vehicleId?: string;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  id?: string;
  inputClassName?: string;
}

export const DealerComboboxInput: React.FC<DealerComboboxInputProps> = ({
  value,
  onChange,
  vehicleId,
  placeholder = "e.g. Rahul Sharma or pick dealer",
  required = false,
  autoFocus = false,
  id = "customerName",
  inputClassName,
}) => {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [savingNewDealer, setSavingNewDealer] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState("");
  const [saveErrorMessage, setSaveErrorMessage] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch dealers for vehicle
  const fetchDealers = useCallback(async () => {
    if (!vehicleId) return;
    try {
      setLoading(true);
      const res = await fetch(`${baseUrl}/api/vehicles/${vehicleId}/dealers`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setDealers(data.dealers || []);
      }
    } catch (err) {
      console.error("Failed to load dealers in combobox:", err);
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    fetchDealers();
  }, [fetchDealers]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const trimmedValue = value.trim();

  // Filter dealers based on input
  const filteredDealers = dealers.filter((d) =>
    trimmedValue ? d.name.toLowerCase().includes(trimmedValue.toLowerCase()) : true
  );

  // Check if current typed value exactly matches an existing dealer
  const exactMatchDealer = dealers.find(
    (d) => d.name.toLowerCase() === trimmedValue.toLowerCase()
  );

  // Quick-Add as Dealer handler
  const handleQuickAddDealer = async () => {
    if (!vehicleId || !trimmedValue) return;

    setSavingNewDealer(true);
    setSaveErrorMessage("");
    setSaveSuccessMessage("");

    try {
      const res = await fetch(`${baseUrl}/api/vehicles/${vehicleId}/dealers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: trimmedValue }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save dealer");
      }

      setDealers((prev) => {
        const updated = [...prev, data.dealer];
        return updated.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "accent" })
        );
      });

      // Keep the input value as the newly saved dealer name
      onChange(data.dealer.name);
      setSaveSuccessMessage(`Saved "${data.dealer.name}" as dealer!`);
      setTimeout(() => setSaveSuccessMessage(""), 3000);
      setIsOpen(false);
    } catch (err: unknown) {
      setSaveErrorMessage(
        err instanceof Error ? err.message : "Failed to save dealer"
      );
      setTimeout(() => setSaveErrorMessage(""), 3500);
    } finally {
      setSavingNewDealer(false);
    }
  };

  const handleSelectDealer = (dealerName: string) => {
    onChange(dealerName);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input Group */}
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          required={required}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className={
            inputClassName ||
            "w-full bg-[#101020] border border-white/10 rounded-2xl px-4 py-3 pr-20 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
          }
        />

        {/* Right Action Icons: Dealer badge indicator & Dropdown Arrow */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {exactMatchDealer && (
            <span
              className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30"
              title="Verified Dealer Preset"
            >
              <Building2 className="w-2.5 h-2.5" />
              <span>Dealer</span>
            </span>
          )}

          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-slate-500 hover:text-slate-300 transition-colors"
              title="Clear"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Toggle dealer list"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isOpen ? "rotate-180 text-indigo-400" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Success / Error Toast for Quick Add */}
      {saveSuccessMessage && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl animate-in fade-in">
          <Check className="w-3.5 h-3.5 shrink-0" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {saveErrorMessage && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl animate-in fade-in">
          <X className="w-3.5 h-3.5 shrink-0" />
          <span>{saveErrorMessage}</span>
        </div>
      )}

      {/* Dropdown Suggestions */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-[#17172c] border border-white/15 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-3.5 py-2 border-b border-white/5 flex items-center justify-between bg-black/20">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Building2 className="w-3 h-3 text-violet-400" />
              Dealers {dealers.length > 0 && `(${dealers.length})`}
            </span>
            {vehicleId && (
              <span className="text-[10px] text-slate-500">Vehicle Isolated</span>
            )}
          </div>

          {/* Quick-Add Option: Shown when typed name has letters and isn't already a saved dealer */}
          {trimmedValue && !exactMatchDealer && vehicleId && (
            <div className="p-2 border-b border-white/5 bg-violet-950/20">
              <button
                type="button"
                onClick={handleQuickAddDealer}
                disabled={savingNewDealer}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-xs font-semibold text-violet-200 transition-all active:scale-[0.99] disabled:opacity-50 text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {savingNewDealer ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400 shrink-0" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  )}
                  <span className="truncate">
                    Save <span className="text-white font-bold">&quot;{trimmedValue}&quot;</span> as Dealer
                  </span>
                </div>
                <span className="text-[10px] bg-violet-500/30 text-violet-300 px-2 py-0.5 rounded-full shrink-0 font-normal">
                  + Preset
                </span>
              </button>
            </div>
          )}

          {/* List of Dealers */}
          <div className="max-h-56 overflow-y-auto divide-y divide-white/5">
            {loading ? (
              <div className="py-4 flex items-center justify-center gap-2 text-slate-400 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                <span>Loading dealers...</span>
              </div>
            ) : filteredDealers.length > 0 ? (
              filteredDealers.map((dealer) => {
                const isSelected =
                  dealer.name.toLowerCase() === value.trim().toLowerCase();

                return (
                  <button
                    key={dealer._id}
                    type="button"
                    onClick={() => handleSelectDealer(dealer.name)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs transition-colors hover:bg-violet-500/15 ${
                      isSelected
                        ? "bg-violet-500/20 text-white font-semibold"
                        : "text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-violet-500/20 text-violet-300 flex items-center justify-center font-bold text-[10px] shrink-0 border border-violet-500/30">
                        {dealer.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate">{dealer.name}</span>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-violet-400 shrink-0" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="py-4 px-3.5 text-center">
                <p className="text-xs text-slate-400">
                  {trimmedValue
                    ? `No existing dealer matching "${trimmedValue}"`
                    : "No dealers saved for this vehicle yet."}
                </p>
                {trimmedValue && vehicleId && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Click &quot;Save as Dealer&quot; above to add it to your preset list.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
