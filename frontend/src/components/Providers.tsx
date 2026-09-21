"use client";

import React from "react";
import { SWRConfig } from "swr";
import { fetcher } from "@/lib/api";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 2000,
        shouldRetryOnError: false,
        refreshInterval: 30000,
      }}
    >
      {children}
    </SWRConfig>
  );
}
