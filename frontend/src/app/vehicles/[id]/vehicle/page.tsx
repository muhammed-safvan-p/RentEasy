"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function VehicleRedirectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (id) {
      router.replace(`/vehicles/${id}/details`);
    }
  }, [id, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
    </div>
  );
}
