import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users-schema";

export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull().default("New Chat"),
    isPinned: boolean("is_pinned").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  },
  (table) => [index("chat_sessions_user_id_idx").on(table.userId)],
);

export type ChatSessionRecord = typeof chatSessions.$inferSelect;
export type NewChatSessionRecord = typeof chatSessions.$inferInsert;
