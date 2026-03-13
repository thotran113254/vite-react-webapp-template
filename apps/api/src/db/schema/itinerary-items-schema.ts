import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { trips } from "./trips-schema";

export const itineraryItems = pgTable(
  "itinerary_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    dayNumber: integer("day_number").notNull(),
    startTime: varchar("start_time", { length: 10 }).notNull(),
    endTime: varchar("end_time", { length: 10 }).notNull().default(""),
    type: varchar("type", { length: 20 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    subtitle: text("subtitle").notNull().default(""),
    location: varchar("location", { length: 300 }).notNull().default(""),
    confirmationCode: varchar("confirmation_code", { length: 50 })
      .notNull()
      .default(""),
    notes: text("notes").notNull().default(""),
    metadata: jsonb("metadata").notNull().default({}),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("itinerary_items_trip_id_idx").on(table.tripId),
    index("itinerary_items_day_number_idx").on(table.tripId, table.dayNumber),
  ],
);

export type ItineraryItemRecord = typeof itineraryItems.$inferSelect;
export type NewItineraryItemRecord = typeof itineraryItems.$inferInsert;
