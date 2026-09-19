export interface VehicleOwner {
  _id: string;
  username: string;
  email?: string;
}

export interface OperationalNote {
  _id: string;
  text: string;
  createdBy?: {
    _id: string;
    username: string;
  };
  createdAt: string;
}

export interface Vehicle {
  _id: string;
  name: string;
  plateNumber: string;
  isActive: boolean;
  notes?: string;
  operationalNotes?: OperationalNote[];
  imageUrl?: string | null;
  ownerIds: VehicleOwner[];
  fuelType?: "Petrol" | "Diesel" | "Electric" | "Hybrid" | "CNG" | string;
  transmission?: "Manual" | "Automatic" | string;
  seatingCapacity?: number;
  dailyRate?: number;
  hourlyRate?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface VehicleStatus {
  status: "booked" | "available";
  until?: string;
  nextBookingDate?: string;
}
