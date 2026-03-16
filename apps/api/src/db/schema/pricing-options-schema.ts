import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * System-wide pricing option definitions (combo types, day types).
 * Admin-managed, AI-readable via aiVisible flag.
 * category: 'combo_type' | 'day_type'
 */
export const pricingOptions = pgTable(
  "pricing_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    category: varchar("category", { length: 30 }).notNull(),
    optionKey: varchar("option_key", { length: 50 }).notNull(),
    label: varchar("label", { length: 100 }).notNull(),
    description: text("description"),
    config: jsonb("config").default({}),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    aiVisible: boolean("ai_visible").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("pricing_options_category_key_idx").on(table.category, table.optionKey),
    index("pricing_options_category_idx").on(table.category),
  ],
);

export type PricingOptionRecord = typeof pricingOptions.$inferSelect;
export type NewPricingOptionRecord = typeof pricingOptions.$inferInsert;
