export type TripStatus = "draft" | "active" | "completed" | "cancelled";

export type ItineraryItemType =
  | "flight"
  | "hotel"
  | "restaurant"
  | "tour"
  | "transport"
  | "activity";

export interface Trip {
  id: string;
  userId: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  guests: number;
  status: TripStatus;
  coverImage: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItineraryItem {
  id: string;
  tripId: string;
  dayNumber: number;
  startTime: string;
  endTime: string;
  type: ItineraryItemType;
  title: string;
  subtitle: string;
  location: string;
  confirmationCode: string;
  notes: string;
  metadata: Record<string, unknown>;
  sortOrder: number;
  createdAt: string;
}

export type CreateTripDto = {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  guests?: number;
  coverImage?: string;
  notes?: string;
};

export type UpdateTripDto = Partial<CreateTripDto> & {
  status?: TripStatus;
};

export type CreateItineraryItemDto = {
  dayNumber: number;
  startTime: string;
  endTime?: string;
  type: ItineraryItemType;
  title: string;
  subtitle?: string;
  location?: string;
  confirmationCode?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  sortOrder?: number;
};

export type UpdateItineraryItemDto = Partial<CreateItineraryItemDto>;
