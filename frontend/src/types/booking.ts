export type FilterKey = "all" | "active" | "due" | "upcoming" | "completed" | "cancelled";

export interface BookingVehicle {
  _id: string;
  name: string;
  plateNumber: string;
  imageUrl?: string;
  fuelType?: string;
  transmission?: string;
  seatingCapacity?: number;
  isActive?: boolean;
}

export interface BookingPayment {
  _id: string;
  bookingId: string;
  vehicleId: string;
  amount: number;
  paymentMethod: "cash" | "bank";
  paidAt: string;
  note?: string;
  recordedBy?: {
    _id: string;
    username: string;
  };
}

export interface Booking {
  _id: string;
  vehicleId: string | { _id: string; name: string; plateNumber: string };
  customerName: string;
  startDateTime: string;
  endDateTime: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  refundedAmount?: number;
  isCancelled: boolean;
  cancelledAt?: string;
  cancellationNote?: string;
  createdBy?: {
    _id: string;
    username: string;
  };
}

export interface CalendarBooking {
  _id: string;
  customerName: string;
  startDateTime: string;
  endDateTime: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  isCancelled: boolean;
}
