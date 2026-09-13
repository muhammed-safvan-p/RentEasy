"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";

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
    ownerIds: [] as string[],
  });

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

  // Fetch users and vehicle data
  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      try {
        // Fetch users
        const usersRes = await fetch(`${baseUrl}/api/admin/users/list`, {
          credentials: "include",
        });
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData);
        }

        // Fetch vehicle
        const vehicleRes = await fetch(`${baseUrl}/api/admin/vehicles/${id}`, {
          credentials: "include",
        });
        if (!vehicleRes.ok) throw new Error("Vehicle not found");
        
        const vehicleData = await vehicleRes.json();
        setFormData({
          name: vehicleData.name || "",
          plateNumber: vehicleData.plateNumber || "",
          notes: vehicleData.notes || "",
          ownerIds: vehicleData.ownerIds ? vehicleData.ownerIds.map((o: any) => o._id || o) : [],
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id, baseUrl]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === "ownerIds") {
      const select = e.target as HTMLSelectElement;
      const selectedValues = Array.from(select.selectedOptions, option => option.value);
      setFormData(prev => ({ ...prev, ownerIds: selectedValues }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`${baseUrl}/api/admin/vehicles/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update vehicle");
      }

      router.push(`/admin/vehicles/${id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
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
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm">
              {error}
            </div>
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
