"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function EditVehiclePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (id) {
      router.replace(`/admin/vehicles/${id}?edit=true`);
    }
  }, [id, router]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      <p className="text-sm font-medium text-slate-500">Opening vehicle editor...</p>
    </div>
  );
}
