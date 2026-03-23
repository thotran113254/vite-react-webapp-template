import {
  pgTable,
  uuid,
  varchar,
  integer,
  date,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { propertyRooms } from "./property-rooms-schema";

export const roomPricing = pgTable(
  "room_pricing",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id").notNull().references(() => propertyRooms.id, { onDelete: "cascade" }),
    comboType: varchar("combo_type", { length: 20 }).notNull(),
    dayType: varchar("day_type", { length: 20 }).notNull(),
    seasonName: varchar("season_name", { length: 100 }).notNull().default("default"),
    seasonStart: date("season_start"),
    seasonEnd: date("season_end"),
    standardGuests: integer("standard_guests").notNull(),
    price: integer("price").notNull(),
    discountPrice: integer("discount_price"),
    pricePlus1: integer("price_plus1"),
    priceMinus1: integer("price_minus1"),
    discountPricePlus1: integer("discount_price_plus1"),
    discountPriceMinus1: integer("discount_price_minus1"),
    underStandardPrice: integer("under_standard_price"),
    extraAdultSurcharge: integer("extra_adult_surcharge"),
    extraChildSurcharge: integer("extra_child_surcharge"),
    surchargeRules: jsonb("surcharge_rules").default([]),
    extraNight: integer("extra_night"),
    includedAmenities: text("included_amenities"),
    notes: text("notes"),
    aiVisible: boolean("ai_visible").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("room_pricing_room_id_idx").on(table.roomId),
    uniqueIndex("room_pricing_room_day_season_idx").on(table.roomId, table.dayType, table.seasonName, table.seasonStart),
  ],
);

export type RoomPricingRecord = typeof roomPricing.$inferSelect;
export type NewRoomPricingRecord = typeof roomPricing.$inferInsert;
