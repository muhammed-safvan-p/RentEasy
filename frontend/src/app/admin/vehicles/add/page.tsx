"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { VehicleForm, VehicleFormData } from "@/components/vehicles/VehicleForm";

export default function AddVehiclePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successNotice, setSuccessNotice] = useState(false);

  const handleSubmit = async (data: VehicleFormData) => {
    setSubmitting(true);
    setError("");

    try {
      await api.post("/api/admin/vehicles", data);
      setSuccessNotice(true);

      setTimeout(() => {
        router.push("/admin/vehicles");
        router.refresh();
      }, 700);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create vehicle.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setSubmitting(false);
    }
  };

  return (
    <VehicleForm
      mode="admin"
      onSubmit={handleSubmit}
      submitting={submitting}
      successNotice={successNotice}
      error={error}
      onErrorDismiss={() => setError("")}
      onCancel={() => router.push("/admin/vehicles")}
    />
  );
}
