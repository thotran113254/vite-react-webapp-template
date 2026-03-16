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
  pricePlus1: z.number().int().min(0).optional(),
  priceMinus1: z.number().int().min(0).optional(),
  extraNight: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  aiVisible: z.boolean().optional(),
});

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
  category: z.enum(["combo_type", "day_type"]),
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
  isEnabled: z.boolean(),
  description: z.string().optional(),
});

export const aiToggleSchema = z.object({
  entityType: z.enum([
    "market", "competitor", "customer_journey", "target_customer",
    "attraction", "dining_spot", "transportation", "inventory_strategy",
    "property", "property_evaluation", "room", "room_pricing", "pricing_config",
    "itinerary_template",
  ]),
  entityId: z.string().uuid(),
});
