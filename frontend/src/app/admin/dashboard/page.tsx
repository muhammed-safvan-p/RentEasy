"use client";

import { useEffect, useState } from "react";

export default function AdminDashboardPage() {
  const [message, setMessage] = useState("Loading dashboard...");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
        const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
          credentials: "include",
        });
        
        if (res.ok) {
          const data = await res.json();
          setMessage(data.message);
        } else {
          setMessage("Failed to load dashboard data. Are you an admin?");
        }
      } catch (err) {
        setMessage("Error connecting to server.");
      }
    };

    fetchDashboard();
  }, []);

  return (
    <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
      <h2 className="text-3xl font-bold text-slate-800 mb-4">Welcome Back!</h2>
      <p className="text-lg text-slate-600">
        {message}
      </p>
      
      <div className="mt-12 p-6 bg-indigo-50 rounded-xl border border-indigo-100">
        <h3 className="text-indigo-800 font-semibold mb-2">Getting Started</h3>
        <p className="text-indigo-600">
          This is the admin panel foundation. The other sections (Users, Vehicles, Bookings, Payments) will be built out soon.
        </p>
      </div>
    </div>
  );
}
