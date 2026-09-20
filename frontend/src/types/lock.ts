export interface VehicleLock {
  _id: string;
  vehicleId: string;
  lockedBy?: {
    _id: string;
    username: string;
  };
  startDate: string;
  endDate: string;
  reason: string;
  createdAt: string;
}
