"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { api } from "@/lib/api";
import { ErrorBanner } from "@/components/common/ErrorBanner";

interface User {
  _id: string;
  username: string;
}

export default function EditVehiclePage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  
  const [formData, setFormData] = useState({
    name: "",
    plateNumber: "",
    notes: "",
    imageUrl: "",
    fuelType: "Diesel",
    transmission: "Manual",
    seatingCapacity: "5",
    ownerIds: [] as string[],
  });

  // Fetch users and vehicle data
  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      try {
        // Fetch users
        const usersData = await api.get<User[]>("/api/admin/users/list").catch(() => [] as User[]);
        setUsers(usersData);

        // Fetch vehicle
        const vehicleData = await api.get<{
          name?: string;
          plateNumber?: string;
          notes?: string;
          imageUrl?: string;
          fuelType?: string;
          transmission?: string;
          seatingCapacity?: number;
          ownerIds?: ({ _id?: string } | string)[];
        }>(`/api/admin/vehicles/${id}`);
        
        setFormData({
          name: vehicleData.name || "",
          plateNumber: vehicleData.plateNumber || "",
          notes: vehicleData.notes || "",
          imageUrl: vehicleData.imageUrl || "",
          fuelType: vehicleData.fuelType || "Diesel",
          transmission: vehicleData.transmission || "Manual",
          seatingCapacity: vehicleData.seatingCapacity !== undefined ? String(vehicleData.seatingCapacity) : "5",
          ownerIds: vehicleData.ownerIds
            ? vehicleData.ownerIds.map((o) => (typeof o === "object" && o?._id ? o._id : String(o)))
            : [],
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load vehicle data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleOwnerChange = (userId: string) => {
    setFormData((prev) => {
      const exists = prev.ownerIds.includes(userId);
      return {
        ...prev,
        ownerIds: exists
          ? prev.ownerIds.filter((id) => id !== userId)
          : [...prev.ownerIds, userId],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.plateNumber.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await api.put(`/api/admin/vehicles/${id}`, formData);

      router.push(`/admin/vehicles/${id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update vehicle");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="animate-pulse h-8 w-32 bg-slate-100 rounded"></div>
        <div className="animate-pulse h-96 w-full bg-slate-100 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Vehicle
      </button>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-8 py-5">
          <h2 className="text-xl font-bold text-slate-800">Edit Vehicle</h2>
          <p className="text-sm text-slate-500 mt-1">
            Update vehicle details.
          </p>
        </div>

        <div className="p-8">
          {error && (
            <ErrorBanner
              message={error}
              onDismiss={() => setError("")}
              className="mb-6"
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Vehicle Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Toyota Camry"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-sm"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Plate Number *
                </label>
                <input
                  type="text"
                  name="plateNumber"
                  required
                  value={formData.plateNumber}
                  onChange={handleChange}
                  placeholder="e.g. MH 12 AB 1234"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all uppercase text-sm"
                />
              </div>
            </div>

            {/* Vehicle Specs */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Fuel Type
                </label>
                <select
                  name="fuelType"
                  value={formData.fuelType}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-sm"
                >
                  <option value="Diesel">Diesel</option>
                  <option value="Petrol">Petrol</option>
                  <option value="Electric">Electric</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="CNG">CNG</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Transmission
                </label>
                <select
                  name="transmission"
                  value={formData.transmission}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-sm"
                >
                  <option value="Manual">Manual</option>
                  <option value="Automatic">Automatic</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Seating
                </label>
                <input
                  type="number"
                  name="seatingCapacity"
                  min="1"
                  max="50"
                  value={formData.seatingCapacity}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-sm"
                />
              </div>
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Vehicle Image URL
              </label>
              <input
                type="url"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleChange}
                placeholder="https://example.com/vehicle-photo.jpg"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Assign Owners
              </label>
              <p className="text-xs text-slate-500 mb-2">Hold Ctrl (Windows) or Cmd (Mac) to select multiple owners.</p>
              <select
                name="ownerIds"
                multiple
                value={formData.ownerIds}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-sm min-h-[100px]"
              >
                {users.map(user => (
                  <option key={user._id} value={user._id} className="py-1">
                    {user.username}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any additional information..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-sm"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving || loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
