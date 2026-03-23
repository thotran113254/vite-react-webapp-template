export interface MarketTransportation {
  id: string;
  marketId: string;
  routeSegment: string;
  transportType: string;
  departurePoints: string | null;
  arrivalPoints: string | null;
  duration: string | null;
  costInfo: string | null;
  convenienceNotes: string | null;
  packageIntegration: string | null;
  suitableFor: string | null;
  notes: string | null;
  sortOrder: number;
  aiVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MarketInventoryStrategy {
  id: string;
  marketId: string;
  monthRange: string;
  seasonName: string | null;
  demandLevel: string | null;
  priceVariation: string | null;
  holdingType: string | null;
  targetSegment: string | null;
  applicablePeriods: string | null;
  notes: string | null;
  sortOrder: number;
  aiVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MarketProperty {
  id: string;
  marketId: string;
  name: string;
  slug: string;
  propertyCode: string | null;
  type: string;
  starRating: string | null;
  address: string | null;
  locationDetail: string | null;
  description: string | null;
  amenities: string[];
  images: string[];
  contactInfo: Record<string, unknown>;
  invoiceStatus: string;
  notes: string | null;
  status: string;
  aiVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyRoom {
  id: string;
  propertyId: string;
  roomType: string;
  bookingCode: string | null;
  capacity: number;
  description: string | null;
  amenities: string[];
  images: string[];
  sortOrder: number;
  aiVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoomPricing {
  id: string;
  roomId: string;
  comboType: string;
  dayType: string;
  seasonName: string;
  seasonStart: string | null;
  seasonEnd: string | null;
  standardGuests: number;
  price: number;
  discountPrice: number | null;
  pricePlus1: number | null;
  priceMinus1: number | null;
  discountPricePlus1: number | null;
  discountPriceMinus1: number | null;
  underStandardPrice: number | null;
  extraAdultSurcharge: number | null;
  extraChildSurcharge: number | null;
  surchargeRules: Array<{ label: string; ageMin: number; ageMax: number; price: number }>;
  extraNight: number | null;
  includedAmenities: string | null;
  notes: string | null;
  aiVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransportProvider {
  id: string;
  marketId: string;
  providerName: string;
  providerCode: string | null;
  transportCategory: string;
  routeName: string;
  contactInfo: Record<string, unknown>;
  pickupPoints: Array<{ name: string; time: string }>;
  images: string[];
  pricingNotes: string | null;
  notes: string | null;
  sortOrder: number;
  aiVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransportPricing {
  id: string;
  providerId: string;
  vehicleClass: string;
  seatType: string;
  capacityPerUnit: number;
  onewayListedPrice: number;
  onewayDiscountPrice: number | null;
  roundtripListedPrice: number | null;
  roundtripDiscountPrice: number | null;
  childFreeUnder: number | null;
  childDiscountUnder: number | null;
  childDiscountAmount: number | null;
  onboardServices: string | null;
  crossProvinceSurcharges: Array<{ province: string; surcharge: number }>;
  notes: string | null;
  sortOrder: number;
  aiVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationCriteria {
  id: string;
  marketId: string | null;
  category: string;
  subcategory: string | null;
  criteriaName: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyEvaluation {
  id: string;
  propertyId: string;
  criteriaId: string;
  value: string | null;
  notes: string | null;
  aiVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ItineraryTemplate {
  id: string;
  marketId: string;
  title: string;
  durationDays: number;
  durationNights: number;
  theme: string | null;
  description: string | null;
  highlights: string[];
  status: string;
  aiVisible: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ItineraryTemplateItem {
  id: string;
  templateId: string;
  dayNumber: number;
  timeOfDay: string;
  timeStart: string | null;
  timeEnd: string | null;
  activity: string;
  location: string | null;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PricingConfig {
  id: string;
  marketId: string | null;
  propertyId: string | null;
  ruleName: string;
  ruleType: string;
  config: Record<string, unknown>;
  description: string | null;
  isActive: boolean;
  aiVisible: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PricingOption {
  id: string;
  category: string;
  optionKey: string;
  label: string;
  description: string | null;
  config: Record<string, unknown>;
  sortOrder: number;
  isActive: boolean;
  aiVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiDataSetting {
  id: string;
  dataCategory: string;
  isEnabled: boolean;
  creativityLevel: "strict" | "enhanced" | "creative";
  description: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

export interface AiChatConfig {
  id: string;
  configKey: string;
  configValue: string;
  configType: "string" | "number" | "boolean" | "text";
  category: "model" | "prompt" | "behavior" | "skill";
  label: string;
  description: string | null;
  sortOrder: number;
  updatedAt: string;
}
