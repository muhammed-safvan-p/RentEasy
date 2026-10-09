/**
 * Centralized TypeScript type definitions for RentEasy frontend
 */

export * from "./booking";
export * from "./wallet";
export * from "./vehicle";
export * from "./lock";
export * from "./dealer";


export interface User {
  _id: string;
  username: string;
  phone?: string;
  email?: string;
  role?: "admin" | "owner" | "user" | string;
  isBlock?: boolean;
  isBlocked?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
