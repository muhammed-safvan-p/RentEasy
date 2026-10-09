"use client";

import React, { useEffect } from "react";
import { SWRConfig } from "swr";
import { fetcher } from "@/lib/api";
import { serverStatusManager } from "@/lib/serverStatus";
import ServerStatusBanner from "@/components/common/ServerStatusBanner";

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Proactively start warming up Render backend as soon as frontend loads
    serverStatusManager.preemptiveWakeup();
    // Keep backend alive while user keeps tab open
    serverStatusManager.initKeepAlive();
  }, []);

  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 2000,
        shouldRetryOnError: false,
      }}
    >
      <ServerStatusBanner />
      {children}
    </SWRConfig>
  );
}
