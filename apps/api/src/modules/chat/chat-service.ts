import { eq, desc, asc } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "../../db/connection.js";
import { chatSessions, chatMessages } from "../../db/schema/index.js";
import type { ChatSession, ChatMessage } from "@app/shared";
import { generateChatResponse } from "./gemini-service.js";
import { buildCatalog } from "../market-data/ai-context-builder.js";

const MAX_HISTORY_MESSAGES = 30;

function toSession(row: typeof chatSessions.$inferSelect): ChatSession {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
  };
}

function toMessage(row: typeof chatMessages.$inferSelect): ChatMessage {
  return {
    id: row.id,
    sessionId: row.sessionId,
    role: row.role as ChatMessage["role"],
    content: row.content,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listSessions(userId: string): Promise<ChatSession[]> {
  const rows = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.userId, userId))
    .orderBy(desc(chatSessions.createdAt));
  return rows.map(toSession);
}

export async function createSession(
  userId: string,
  title?: string,
): Promise<ChatSession> {
  const [row] = await db
    .insert(chatSessions)
    .values({ userId, title: title ?? "New Chat" })
    .returning();
  return toSession(row!);
}

export async function deleteSession(
  id: string,
  userId: string,
): Promise<void> {
  const [existing] = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, id))
    .limit(1);

  if (!existing) throw new HTTPException(404, { message: "Session not found" });
  if (existing.userId !== userId)
    throw new HTTPException(403, { message: "Access denied" });

  await db.delete(chatSessions).where(eq(chatSessions.id, id));
}

export async function getMessages(
  sessionId: string,
  userId: string,
): Promise<ChatMessage[]> {
  const [session] = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);

  if (!session) throw new HTTPException(404, { message: "Session not found" });
  if (session.userId !== userId)
    throw new HTTPException(403, { message: "Access denied" });

  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt));

  return rows.map(toMessage);
}

export async function sendMessage(
  sessionId: string,
  userId: string,
  content: string,
  userRole: string = "user",
): Promise<ChatMessage[]> {
  const [session] = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);

  if (!session) throw new HTTPException(404, { message: "Session not found" });
  if (session.userId !== userId)
    throw new HTTPException(403, { message: "Access denied" });

  // Store user message
  const [userMsg] = await db
    .insert(chatMessages)
    .values({ sessionId, role: "user", content, metadata: {} })
    .returning();

  // Fetch conversation history for context
  const allHistory = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt));

  const allMapped = allHistory.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  const history = allMapped.length > MAX_HISTORY_MESSAGES
    ? allMapped.slice(-MAX_HISTORY_MESSAGES)
    : allMapped;

  // Build catalog and call Gemini
  const catalog = await buildCatalog();
  const aiResponse = await generateChatResponse(history, catalog, userRole);

  const [assistantMsg] = await db
    .insert(chatMessages)
    .values({ sessionId, role: "assistant", content: aiResponse, metadata: {} })
    .returning();

  return [toMessage(userMsg!), toMessage(assistantMsg!)];
}

/** Prepare context for streaming: save user msg, build history + catalog.
 *  Returns data needed by the SSE route to stream the response. */
export async function prepareStreamContext(
  sessionId: string,
  userId: string,
  content: string,
): Promise<{
  userMsg: ChatMessage;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  catalog: string;
}> {
  const [session] = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);

  if (!session) throw new HTTPException(404, { message: "Session not found" });
  if (session.userId !== userId)
    throw new HTTPException(403, { message: "Access denied" });

  // Store user message
  const [userMsg] = await db
    .insert(chatMessages)
    .values({ sessionId, role: "user", content, metadata: {} })
    .returning();

  // Fetch conversation history
  const allHistory = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt));

  const allMapped = allHistory.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  const history = allMapped.length > MAX_HISTORY_MESSAGES
    ? allMapped.slice(-MAX_HISTORY_MESSAGES)
    : allMapped;

  const catalog = await buildCatalog();

  return { userMsg: toMessage(userMsg!), history, catalog };
}

/** Save complete AI response with optional token usage metadata */
export async function saveAssistantMessage(
  sessionId: string,
  fullContent: string,
  metadata?: Record<string, unknown>,
): Promise<ChatMessage> {
  const [row] = await db
    .insert(chatMessages)
    .values({ sessionId, role: "assistant", content: fullContent, metadata: metadata ?? {} })
    .returning();
  return toMessage(row!);
}
