import { z } from "zod";

export const createPropertySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  type: z.enum(["homestay", "hotel", "villa", "resort"]).optional(),
  starRating: z.string().optional(),
  address: z.string().optional(),
  locationDetail: z.string().optional(),
  description: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  contactInfo: z.record(z.unknown()).optional(),
  invoiceStatus: z.enum(["none", "invoice", "vat_invoice", "business_registration", "in_progress"]).optional(),
  notes: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  aiVisible: z.boolean().optional(),
});

export const updatePropertySchema = createPropertySchema.partial();

export const createPropertyRoomSchema = z.object({
  roomType: z.string().min(1).max(255),
  bookingCode: z.string().max(50).optional(),
  capacity: z.number().int().min(1).optional(),
  description: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  sortOrder: z.number().int().optional(),
  aiVisible: z.boolean().optional(),
});

export const updatePropertyRoomSchema = createPropertyRoomSchema.partial();

export const createRoomPricingSchema = z.object({
  comboType: z.string().min(1).max(20),
  dayType: z.string().min(1).max(20),
  seasonName: z.string().max(100).optional(),
  seasonStart: z.string().optional(),
  seasonEnd: z.string().optional(),
  standardGuests: z.number().int().min(1),
  price: z.number().int().min(0),
  discountPrice: z.number().int().min(0).optional(),
  pricePlus1: z.number().int().min(0).optional(),
  priceMinus1: z.number().int().min(0).optional(),
  discountPricePlus1: z.number().int().min(0).optional(),
  discountPriceMinus1: z.number().int().min(0).optional(),
  underStandardPrice: z.number().int().min(0).optional(),
  extraAdultSurcharge: z.number().int().min(0).optional(),
  extraChildSurcharge: z.number().int().min(0).optional(),
  extraNight: z.number().int().min(0).optional(),
  includedAmenities: z.string().optional(),
  notes: z.string().optional(),
  aiVisible: z.boolean().optional(),
});

export const createTransportProviderSchema = z.object({
  providerName: z.string().min(1).max(255),
  providerCode: z.string().max(50).optional(),
  transportCategory: z.enum(["bus", "ferry"]),
  routeName: z.string().min(1).max(255),
  contactInfo: z.record(z.unknown()).optional(),
  pickupPoints: z.array(z.object({ name: z.string(), time: z.string() })).optional(),
  notes: z.string().optional(),
  sortOrder: z.number().int().optional(),
  aiVisible: z.boolean().optional(),
});

export const updateTransportProviderSchema = createTransportProviderSchema.partial();

export const createTransportPricingSchema = z.object({
  vehicleClass: z.string().min(1).max(50),
  seatType: z.string().min(1).max(50),
  capacityPerUnit: z.number().int().min(1).default(1),
  onewayListedPrice: z.number().int().min(0),
  onewayDiscountPrice: z.number().int().min(0).optional(),
  roundtripListedPrice: z.number().int().min(0).optional(),
  roundtripDiscountPrice: z.number().int().min(0).optional(),
  childFreeUnder: z.number().int().min(0).optional(),
  childDiscountUnder: z.number().int().min(0).optional(),
  childDiscountAmount: z.number().int().min(0).optional(),
  onboardServices: z.string().optional(),
  crossProvinceSurcharges: z.array(z.object({
    province: z.string(),
    surcharge: z.number().int().min(0),
  })).optional(),
  notes: z.string().optional(),
  sortOrder: z.number().int().optional(),
  aiVisible: z.boolean().optional(),
});

export const updateTransportPricingSchema = createTransportPricingSchema.partial();

export const createEvaluationCriteriaSchema = z.object({
  marketId: z.string().uuid().optional(),
  category: z.string().min(1).max(100),
  subcategory: z.string().max(100).optional(),
  criteriaName: z.string().min(1).max(255),
  sortOrder: z.number().int().optional(),
});

export const upsertPropertyEvaluationSchema = z.object({
  criteriaId: z.string().uuid(),
  value: z.string().optional(),
  notes: z.string().optional(),
  aiVisible: z.boolean().optional(),
});

export const createItineraryTemplateSchema = z.object({
  title: z.string().min(1).max(255),
  durationDays: z.number().int().min(1),
  durationNights: z.number().int().min(0),
  theme: z.string().max(50).optional(),
  description: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  aiVisible: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const createItineraryTemplateItemSchema = z.object({
  dayNumber: z.number().int().min(1),
  timeOfDay: z.enum(["morning", "afternoon", "evening"]),
  timeStart: z.string().max(10).optional(),
  timeEnd: z.string().max(10).optional(),
  activity: z.string().min(1),
  location: z.string().max(255).optional(),
  notes: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const createPricingConfigSchema = z.object({
  marketId: z.string().uuid().optional(),
  propertyId: z.string().uuid().optional(),
  ruleName: z.string().min(1).max(255),
  ruleType: z.enum([
    "child_policy", "extra_guest_policy", "surcharge",
    "discount", "combo_formula", "profit_margin", "transport_pricing",
  ]),
  config: z.record(z.unknown()),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  aiVisible: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const createPricingOptionSchema = z.object({
  category: z.enum(["combo_type", "day_type", "season"]),
  optionKey: z.string().min(1).max(50),
  label: z.string().min(1).max(100),
  description: z.string().optional(),
  config: z.record(z.unknown()).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  aiVisible: z.boolean().optional(),
});

export const updatePricingOptionSchema = createPricingOptionSchema.partial().omit({ category: true, optionKey: true });

export const updateAiDataSettingSchema = z.object({
  isEnabled: z.boolean().optional(),
  creativityLevel: z.enum(["strict", "enhanced", "creative"]).optional(),
  description: z.string().optional(),
});

export const updateAiChatConfigSchema = z.object({
  configValue: z.string(),
});

const DAY_TYPE_ENUM = z.enum(["weekday", "friday", "saturday", "sunday", "holiday"]);

export const comboCalculateSchema = z.object({
  marketSlug: z.string().min(1),
  propertySlug: z.string().optional(),
  numAdults: z.number().int().min(1),
  numChildrenUnder10: z.number().int().min(0).default(0),
  numChildrenUnder5: z.number().int().min(0).default(0),
  numNights: z.number().int().min(1).max(30),
  /** Array of day types, one per night - for mixed-day bookings */
  dayTypes: z.array(DAY_TYPE_ENUM).optional(),
  /** Single day type for all nights (backward compat) */
  dayType: DAY_TYPE_ENUM.optional(),
  transportClass: z.enum(["cabin", "limousine", "sleeper"]).optional(),
  ferryClass: z.enum(["speed_boat", "small_boat"]).optional(),
  profitMarginOverride: z.number().min(0).max(100).optional(),
  /** Departure province for cross-province surcharge */
  departureProvince: z.string().optional(),
  /** Trip type: roundtrip (default) or oneway */
  tripType: z.enum(["oneway", "roundtrip"]).optional(),
}).refine(
  (d) => (d.dayTypes && d.dayTypes.length > 0) || d.dayType,
  { message: "dayType or dayTypes required" },
);

export const aiToggleSchema = z.object({
  entityType: z.enum([
    "market", "competitor", "customer_journey", "target_customer",
    "attraction", "dining_spot", "transportation", "inventory_strategy",
    "property", "property_evaluation", "room", "room_pricing", "pricing_config",
    "itinerary_template", "transport_provider", "transport_pricing",
  ]),
  entityId: z.string().uuid(),
});
