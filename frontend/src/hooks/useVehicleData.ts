"use client";

import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/api";

import { User, Vehicle, VehicleStatus, WalletData } from "@/types";

export interface GarageVehicle {
  _id: string;
  name: string;
  plateNumber: string;
  isActive?: boolean;
  totalBookings?: number;
  monthBookings?: number;
  currentBalance?: number;
  currentBookingStatus?: {
    isBooked: boolean;
    endsAt?: string;
    nextBookingDate?: string;
    hasNextBookingThisMonth: boolean;
    customerName?: string;
    message?: string;
  };
}

export type VehicleDetail = Vehicle;

/**
 * Hook to fetch logged in user info
 */
export function useCurrentUser() {
  const { data, error, isLoading, mutate: revalidate } = useSWR<User>(
    "/api/user/me",
    fetcher
  );
  return {
    user: data || null,
    isLoading,
    error,
    revalidate,
  };
}

/**
 * Hook to fetch all garage vehicles for the current user
 */
export function useUserVehicles() {
  const { data, error, isLoading, mutate: revalidate } = useSWR<GarageVehicle[]>(
    "/api/user/vehicles",
    fetcher
  );
  return {
    vehicles: data || [],
    isLoading,
    error,
    revalidate,
  };
}

/**
 * Hook to fetch single vehicle details
 */
export function useVehicleDetail(vehicleId?: string | null) {
  const { data, error, isLoading, mutate: revalidate } = useSWR<VehicleDetail>(
    vehicleId ? `/api/vehicles/${vehicleId}` : null,
    fetcher
  );
  return {
    vehicle: data || null,
    isLoading,
    error,
    revalidate,
  };
}

/**
 * Hook to fetch current vehicle booking status
 */
export function useVehicleStatus(vehicleId?: string | null) {
  const { data, error, isLoading, mutate: revalidate } = useSWR<VehicleStatus>(
    vehicleId ? `/api/vehicles/${vehicleId}/status` : null,
    fetcher
  );
  return {
    status: data || null,
    isLoading,
    error,
    revalidate,
  };
}

/**
 * Hook to fetch vehicle wallet balances
 */
export function useVehicleWallet(vehicleId?: string | null) {
  const { data, error, isLoading, mutate: revalidate } = useSWR<any>(
    vehicleId ? `/api/vehicles/${vehicleId}/wallet` : null,
    fetcher
  );
  const wallet: WalletData | null = data ? (data.wallet || data) : null;
  return {
    wallet,
    isLoading,
    error,
    revalidate,
  };
}

/**
 * Global helper to invalidate all related queries for a vehicle and garage dashboard.
 * Calling this after any mutation (booking created, payment recorded, booking cancelled,
 * booking edited, wallet transaction logged) ensures every open or cached screen immediately
 * updates with fresh data.
 */
export async function invalidateVehicleData(vehicleId?: string | null) {
  // 1. Invalidate Garage Fleet Overview
  mutate("/api/user/vehicles");

  if (!vehicleId) return;

  // 2. Invalidate specific vehicle endpoints
  mutate(`/api/vehicles/${vehicleId}`);
  mutate(`/api/vehicles/${vehicleId}/status`);
  mutate(`/api/vehicles/${vehicleId}/wallet`);
  mutate(`/api/vehicles/${vehicleId}/calendar`);

  // 3. Invalidate matching pattern keys (month-specific bookings and transactions)
  mutate(
    (key: any) =>
      typeof key === "string" &&
      (key.includes(`/api/vehicles/${vehicleId}`) || key.includes(`vehicleId=${vehicleId}`)),
    undefined,
    { revalidate: true }
  );
}

/**
 * Global helper to invalidate dashboard garage fleet
 */
export async function invalidateDashboard() {
  mutate("/api/user/vehicles");
}
