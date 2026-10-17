export interface FuelTypeOption {
  value: string;
  label: string;
  icon: string;
}

export interface TransmissionTypeOption {
  value: string;
  label: string;
  icon: string;
}

export const FUEL_TYPES: FuelTypeOption[] = [
  { value: "Diesel", label: "Diesel", icon: "🛢️" },
  { value: "Petrol", label: "Petrol", icon: "⛽" },
  { value: "Electric", label: "Electric", icon: "⚡" },
  { value: "Hybrid", label: "Hybrid", icon: "🔋" },
  { value: "CNG", label: "CNG", icon: "💨" },
];

export const TRANSMISSION_TYPES: TransmissionTypeOption[] = [
  { value: "Manual", label: "Manual", icon: "🕹️" },
  { value: "Automatic", label: "Automatic", icon: "⚡" },
];

export const SEATING_PRESETS: number[] = [4, 5, 7, 8];
