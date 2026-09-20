export interface Dealer {
  _id: string;
  vehicleId: string;
  name: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDealerInput {
  name: string;
}

export interface UpdateDealerInput {
  name: string;
}
