import { z } from "zod";

export const createTripSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  destination: z.string().min(1, "Destination is required").max(200),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  guests: z.number().int().positive().optional(),
  coverImage: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateTripSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  destination: z.string().min(1).max(200).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  guests: z.number().int().positive().optional(),
  coverImage: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(["draft", "active", "completed", "cancelled"]).optional(),
});

const itineraryItemType = z.enum([
  "flight", "hotel", "restaurant", "tour", "transport", "activity",
]);

export const createItineraryItemSchema = z.object({
  dayNumber: z.number().int().positive(),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().optional(),
  type: itineraryItemType,
  title: z.string().min(1, "Title is required").max(200),
  subtitle: z.string().max(500).optional(),
  location: z.string().max(300).optional(),
  confirmationCode: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
  metadata: z.record(z.unknown()).optional(),
  sortOrder: z.number().int().optional(),
});

export const updateItineraryItemSchema = createItineraryItemSchema.partial();

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type CreateItineraryItemInput = z.infer<typeof createItineraryItemSchema>;
export type UpdateItineraryItemInput = z.infer<typeof updateItineraryItemSchema>;
