/**
 * Centralized TypeScript type definitions for RentEasy frontend
 */

export * from "./booking";
export * from "./wallet";
export * from "./vehicle";

export interface User {
  _id: string;
  username: string;
  email?: string;
  role?: "admin" | "owner" | "user" | string;
  isBlocked?: boolean;
  createdAt?: string;
}
