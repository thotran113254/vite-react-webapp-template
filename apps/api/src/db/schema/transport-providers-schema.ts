import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { markets } from "./markets-schema";

export const transportProviders = pgTable(
  "transport_providers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    marketId: uuid("market_id").notNull().references(() => markets.id, { onDelete: "cascade" }),
    providerName: varchar("provider_name", { length: 255 }).notNull(),
    providerCode: varchar("provider_code", { length: 50 }),
    transportCategory: varchar("transport_category", { length: 30 }).notNull(),
    routeName: varchar("route_name", { length: 255 }).notNull(),
    contactInfo: jsonb("contact_info").default({}),
    pickupPoints: jsonb("pickup_points").default([]),
    notes: text("notes"),
    images: jsonb("images").default([]),
    pricingNotes: text("pricing_notes"),
    sortOrder: integer("sort_order").notNull().default(0),
    aiVisible: boolean("ai_visible").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("transport_providers_market_id_idx").on(table.marketId),
    uniqueIndex("transport_providers_market_code_idx").on(table.marketId, table.providerCode),
  ],
);

export type TransportProviderRecord = typeof transportProviders.$inferSelect;
export type NewTransportProviderRecord = typeof transportProviders.$inferInsert;
