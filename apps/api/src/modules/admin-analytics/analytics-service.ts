/**
 * Admin analytics service — FAQ aggregation + staff usage tracking queries.
 */
import { gte, eq, asc, desc, count, sql } from "drizzle-orm";
import { db } from "../../db/connection.js";
import { chatMessages, chatSessions, users } from "../../db/schema/index.js";
import { aggregateFaq, type FaqEntry } from "./faq-aggregator.js";
import type { ChatMessage } from "@app/shared";

export type Period = "7d" | "30d" | "90d" | "all";

export interface StaffUsageEntry {
  userId: string;
  userName: string;
  userEmail: string;
  totalSessions: number;
  totalMessages: number;
  estimatedMinutes: number;
  lastActive: string | null;
}

export interface AdminChatSession {
  id: string;
  userId: string;
  userName: string;
  title: string;
  isPinned: boolean;
  createdAt: string;
  lastMessageAt: string | null;
  messageCount: number;
}

function periodStart(period: Period): Date | null {
  if (period === "all") return null;
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

/** Get all user messages for the period and aggregate into FAQ entries */
export async function getFaqAnalytics(period: Period): Promise<FaqEntry[]> {
  const since = periodStart(period);

  const query = db
    .select({ content: chatMessages.content })
    .from(chatMessages)
    .where(eq(chatMessages.role, "user"))
    .orderBy(desc(chatMessages.createdAt));

  const rows = since
    ? await db
        .select({ content: chatMessages.content })
        .from(chatMessages)
        .where(
          sql`${chatMessages.role} = 'user' AND ${chatMessages.createdAt} >= ${since}`,
        )
    : await query;

  return aggregateFaq(rows.map((r) => r.content));
}

/** Per-staff usage stats for a given period */
export async function getStaffUsage(period: Period): Promise<StaffUsageEntry[]> {
  const since = periodStart(period);

  // Cap session duration at 120 minutes (prevent open-tab inflation)
  const durationExpr = sql<number>`
    LEAST(
      EXTRACT(EPOCH FROM (${chatSessions.lastMessageAt} - ${chatSessions.createdAt})) / 60,
      120
    )`;

  const baseFilter = since
    ? sql`${chatSessions.createdAt} >= ${since}`
    : sql`1=1`;

  const rows = await db
    .select({
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      totalSessions: count(chatSessions.id).as("total_sessions"),
      totalMessages: sql<number>`COUNT(${chatMessages.id})`.as("total_messages"),
      estimatedMinutes: sql<number>`
        COALESCE(SUM(${durationExpr}), 0)`.as("estimated_minutes"),
      lastActive: sql<string | null>`MAX(${chatSessions.lastMessageAt})`.as("last_active"),
    })
    .from(users)
    .innerJoin(chatSessions, eq(chatSessions.userId, users.id))
    .innerJoin(chatMessages, eq(chatMessages.sessionId, chatSessions.id))
    .where(sql`${users.role} != 'admin' AND ${baseFilter}`)
    .groupBy(users.id, users.name, users.email)
    .orderBy(sql`COUNT(${chatMessages.id}) DESC`);

  return rows.map((r) => ({
    userId: r.userId,
    userName: r.userName,
    userEmail: r.userEmail,
    totalSessions: Number(r.totalSessions),
    totalMessages: Number(r.totalMessages),
    estimatedMinutes: Math.round(Number(r.estimatedMinutes)),
    lastActive: r.lastActive ?? null,
  }));
}

/** List sessions for any user (admin view), paginated */
export async function getSessionsByUser(
  userId: string | undefined,
  page: number,
  limit = 20,
): Promise<AdminChatSession[]> {
  const offset = (page - 1) * limit;

  const rows = await db
    .select({
      id: chatSessions.id,
      userId: chatSessions.userId,
      userName: users.name,
      title: chatSessions.title,
      isPinned: chatSessions.isPinned,
      createdAt: chatSessions.createdAt,
      lastMessageAt: chatSessions.lastMessageAt,
      messageCount: sql<number>`COUNT(${chatMessages.id})`.as("message_count"),
    })
    .from(chatSessions)
    .innerJoin(users, eq(users.id, chatSessions.userId))
    .leftJoin(chatMessages, eq(chatMessages.sessionId, chatSessions.id))
    .where(userId ? eq(chatSessions.userId, userId) : sql`1=1`)
    .groupBy(chatSessions.id, users.name)
    .orderBy(desc(chatSessions.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.userName,
    title: r.title,
    isPinned: r.isPinned,
    createdAt: r.createdAt.toISOString(),
    lastMessageAt: r.lastMessageAt?.toISOString() ?? null,
    messageCount: Number(r.messageCount),
  }));
}

/** Get all messages in a session (admin read-only) */
export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt));

  return rows.map((r) => ({
    id: r.id,
    sessionId: r.sessionId,
    role: r.role as ChatMessage["role"],
    content: r.content,
    metadata: (r.metadata ?? {}) as Record<string, unknown>,
    createdAt: r.createdAt.toISOString(),
  }));
}

/** List all non-admin users for the user selector dropdown */
export async function getNonAdminUsers(): Promise<Array<{ id: string; name: string; email: string }>> {
  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(sql`${users.role} != 'admin'`)
    .orderBy(asc(users.name));
}
