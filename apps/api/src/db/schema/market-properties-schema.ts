import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  jsonb,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { markets } from "./markets-schema";

export const marketProperties = pgTable(
  "market_properties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    marketId: uuid("market_id").notNull().references(() => markets.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    propertyCode: varchar("property_code", { length: 20 }),
    type: varchar("type", { length: 50 }).notNull().default("homestay"),
    starRating: decimal("star_rating", { precision: 2, scale: 1 }),
    address: text("address"),
    locationDetail: text("location_detail"),
    description: text("description"),
    amenities: jsonb("amenities").default([]),
    images: jsonb("images").default([]),
    contactInfo: jsonb("contact_info").default({}),
    invoiceStatus: varchar("invoice_status", { length: 50 }).notNull().default("none"),
    notes: text("notes"),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    aiVisible: boolean("ai_visible").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("market_properties_market_slug_idx").on(table.marketId, table.slug),
    index("market_properties_market_id_idx").on(table.marketId),
    index("market_properties_status_idx").on(table.status),
    index("market_properties_ai_visible_idx").on(table.aiVisible),
  ],
);

export type MarketPropertyRecord = typeof marketProperties.$inferSelect;
export type NewMarketPropertyRecord = typeof marketProperties.$inferInsert;
