"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import { api } from "@/lib/api";
import { VehicleForm, VehicleFormData } from "@/components/vehicles/VehicleForm";

export default function UserAddVehiclePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successNotice, setSuccessNotice] = useState(false);

  const handleSubmit = async (data: VehicleFormData) => {
    setSubmitting(true);
    setError("");

    try {
      await api.post("/api/user/vehicles", data);
      setSuccessNotice(true);

      await mutate("/api/user/vehicles");

      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 700);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to register vehicle. Please try again.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setSubmitting(false);
    }
  };

  return (
    <VehicleForm
      mode="user"
      onSubmit={handleSubmit}
      submitting={submitting}
      successNotice={successNotice}
      error={error}
      onErrorDismiss={() => setError("")}
      onCancel={() => router.push("/dashboard")}
    />
  );
}
