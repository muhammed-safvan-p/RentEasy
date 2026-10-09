"use client";

import { useState, useEffect } from "react";
import { API_BASE_URL } from "./api";

export interface ServerStatusState {
  isWakingUp: boolean;
  elapsedSeconds: number;
  isReady: boolean;
}

type Listener = (state: ServerStatusState) => void;

class ServerStatusManager {
  private listeners: Set<Listener> = new Set();
  private pendingRequests: Set<string> = new Set();
  private slowRequestCount = 0;
  private coldStartTimer: NodeJS.Timeout | null = null;
  private tickInterval: NodeJS.Timeout | null = null;
  private readyTimeout: NodeJS.Timeout | null = null;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private prewarmed = false;

  private state: ServerStatusState = {
    isWakingUp: false,
    elapsedSeconds: 0,
    isReady: false,
  };

  private notify() {
    this.listeners.forEach((listener) => listener({ ...this.state }));
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): ServerStatusState {
    return { ...this.state };
  }

  public startRequest(requestId: string): () => void {
    this.pendingRequests.add(requestId);

    // If request takes more than 2.5 seconds, server might be spinning up from cold start
    const timer = setTimeout(() => {
      if (this.pendingRequests.has(requestId)) {
        this.slowRequestCount++;
        this.startWakingUp();
      }
    }, 2500);

    return () => {
      clearTimeout(timer);
      this.pendingRequests.delete(requestId);
      if (this.state.isWakingUp) {
        this.slowRequestCount = Math.max(0, this.slowRequestCount - 1);
        if (this.slowRequestCount === 0 || this.pendingRequests.size === 0) {
          this.markReady();
        }
      }
    };
  }

  private startWakingUp() {
    if (this.state.isWakingUp) return;

    if (this.readyTimeout) {
      clearTimeout(this.readyTimeout);
      this.readyTimeout = null;
    }

    this.state = {
      isWakingUp: true,
      elapsedSeconds: 0,
      isReady: false,
    };
    this.notify();

    if (this.tickInterval) clearInterval(this.tickInterval);
    this.tickInterval = setInterval(() => {
      this.state.elapsedSeconds += 1;
      this.notify();
    }, 1000);
  }

  private markReady() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    this.state = {
      isWakingUp: false,
      elapsedSeconds: 0,
      isReady: true,
    };
    this.notify();

    // Auto-dismiss the "Ready" indicator after 3.5 seconds
    if (this.readyTimeout) clearTimeout(this.readyTimeout);
    this.readyTimeout = setTimeout(() => {
      this.state.isReady = false;
      this.notify();
      this.readyTimeout = null;
    }, 3500);
  }

  public dismiss() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.state.isWakingUp = false;
    this.state.isReady = false;
    this.notify();
  }

  /**
   * Proactively triggers a lightweight health check when the user opens the app.
   * If Render has spun down the container, this wakes it up immediately.
   */
  public preemptiveWakeup() {
    if (typeof window === "undefined" || this.prewarmed) return;
    this.prewarmed = true;

    const pingUrl = `${API_BASE_URL}/api/health`;
    const finish = this.startRequest("preemptive-ping");

    fetch(pingUrl, { method: "GET", cache: "no-store" })
      .then(() => {
        finish();
      })
      .catch(() => {
        finish();
      });
  }

  /**
   * Sets up a 10-minute heartbeat to prevent Render free-tier from sleeping
   * while the user has the browser tab open and active.
   */
  public initKeepAlive() {
    if (typeof window === "undefined" || this.keepAliveInterval) return;

    this.keepAliveInterval = setInterval(() => {
      // Only ping if tab is currently visible
      if (document.visibilityState === "visible") {
        fetch(`${API_BASE_URL}/api/health`, { method: "GET", cache: "no-store" }).catch(() => {});
      }
    }, 10 * 60 * 1000); // 10 minutes (Render sleeps at 15 minutes)
  }
}

export const serverStatusManager = new ServerStatusManager();

/**
 * React hook to observe server wake-up state and elapsed time.
 */
export function useServerStatus(): ServerStatusState & { dismiss: () => void } {
  const [status, setStatus] = useState<ServerStatusState>(serverStatusManager.getState());

  useEffect(() => {
    const unsubscribe = serverStatusManager.subscribe(setStatus);
    return () => unsubscribe();
  }, []);

  return {
    ...status,
    dismiss: () => serverStatusManager.dismiss(),
  };
}

/**
 * Hook for action buttons (Login, Signup, etc.) to show progressive cold-start feedback
 */
export function useActionColdStart(isSubmitting: boolean) {
  const [seconds, setSeconds] = useState(0);
  const [isSlow, setIsSlow] = useState(false);

  const [prevSubmitting, setPrevSubmitting] = useState(isSubmitting);

  if (isSubmitting !== prevSubmitting) {
    setPrevSubmitting(isSubmitting);
    if (!isSubmitting) {
      setSeconds(0);
      setIsSlow(false);
    }
  }

  useEffect(() => {
    if (!isSubmitting) return;

    const slowTimer = setTimeout(() => {
      setIsSlow(true);
    }, 2500);

    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      clearTimeout(slowTimer);
      clearInterval(interval);
    };
  }, [isSubmitting]);

  return {
    isSlow,
    seconds,
  };
}
