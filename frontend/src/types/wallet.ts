export interface WalletData {
  _id: string;
  vehicleId: string;
  cashBalance: number;
  bankBalance: number;
  totalBalance: number;
  updatedAt: string;
}

export interface WalletTransaction {
  _id: string;
  walletId: string;
  vehicleId: string;
  type: "income" | "expense";
  paymentMethod: "cash" | "bank";
  amount: number;
  note?: string;
  transactionDate: string;
  createdAt: string;
  source: "booking" | "manual";
  createdBy?: {
    _id: string;
    username: string;
  };
}

export interface DateGroupedTransactions {
  dateKey: string;
  dateLabel: string;
  transactions: WalletTransaction[];
}

export interface MonthSummary {
  monthIncome: number;
  monthExpense: number;
}
