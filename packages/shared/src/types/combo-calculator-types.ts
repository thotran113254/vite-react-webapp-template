export interface ComboCalculateRequest {
  marketSlug: string;
  propertySlug?: string;
  numAdults: number;
  numChildrenUnder10: number;
  numChildrenUnder5: number;
  numNights: number;
  /** One dayType per night, e.g. ["weekday","friday","saturday"] for Thu+Fri+Sat */
  dayTypes?: string[];
  /** Single dayType (backward compat) - all nights share same type */
  dayType?: string;
  transportClass?: string; // cabin, limousine, sleeper
  ferryClass?: string; // speed_boat, small_boat (null = no ferry)
  profitMarginOverride?: number;
  /** Departure province for cross-province surcharge, e.g. "Quảng Ninh" */
  departureProvince?: string;
  /** Trip type: roundtrip (default) or oneway */
  tripType?: "oneway" | "roundtrip";
}

export interface ComboCalculationResult {
  input: { numPeople: number; numNights: number; dayType: string; dayTypes?: string[]; tripType?: string };
  rooms: ComboRoomAllocation[];
  transport: ComboTransportLine | null;
  ferry: ComboTransportLine | null;
  subtotal: number;
  profitMarginPercent: number;
  marginAmount: number;
  grandTotal: number;
  perPerson: number;
  discountSubtotal: number | null;
  discountGrandTotal: number | null;
  discountPerPerson: number | null;
  /** Warnings about calculation (e.g., no rooms found, missing pricing) */
  warnings?: string[];
}

export interface ComboRoomAllocation {
  propertyName: string;
  roomType: string;
  roomCode: string | null;
  quantity: number;
  guestsPerRoom: number;
  pricePerRoom: number;
  discountPricePerRoom: number | null;
  totalRoomCost: number;
  totalDiscountCost: number | null;
}

export interface ComboTransportLine {
  providerName: string;
  vehicleClass: string;
  seatType: string;
  pricePerPerson: number;
  discountPerPerson: number | null;
  /** Actual price per child (after discount) */
  childPricePerPerson: number | null;
  totalPeople: number;
  childFreeCount: number;
  childDiscountCount: number;
  totalCost: number;
  totalDiscountCost: number | null;
  /** Cross-province surcharge details (null if none) */
  surchargeProvince: string | null;
  surchargePerPerson: number | null;
  surchargeTotal: number | null;
}
