import { eq, desc, asc } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "../../db/connection.js";
import { chatSessions, chatMessages, knowledgeBase } from "../../db/schema/index.js";
import type { ChatSession, ChatMessage } from "@app/shared";
import { generateChatResponse, generateChatResponseStream } from "./gemini-service.js";
import { buildAiContext } from "../market-data/ai-context-builder.js";

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

/** Fetch published KB articles as formatted string */
async function getKbArticles(): Promise<string> {
  const articles = await db
    .select({ title: knowledgeBase.title, content: knowledgeBase.content, category: knowledgeBase.category })
    .from(knowledgeBase)
    .where(eq(knowledgeBase.status, "published"));

  if (articles.length === 0) return "";

  return articles
    .map((a) => `### [${a.category.toUpperCase()}] ${a.title}\n${a.content}`)
    .join("\n\n---\n\n");
}

/** Build full context: structured market data + KB articles */
async function buildKbContext(): Promise<string> {
  const [marketContext, kbArticles] = await Promise.all([
    buildAiContext(),
    getKbArticles(),
  ]);

  if (!kbArticles) return marketContext;
  return `${marketContext}\n\n--- KẾT THÚC DỮ LIỆU THỊ TRƯỜNG ---\n\n${kbArticles}`;
}

export async function sendMessage(
  sessionId: string,
  userId: string,
  content: string,
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
  const historyRows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt));

  const history = historyRows.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Build KB context and call Gemini
  const kbContext = await buildKbContext();
  const aiResponse = await generateChatResponse(history, kbContext);

  const [assistantMsg] = await db
    .insert(chatMessages)
    .values({ sessionId, role: "assistant", content: aiResponse, metadata: {} })
    .returning();

  return [toMessage(userMsg!), toMessage(assistantMsg!)];
}

/** Prepare context for streaming: save user msg, build history + KB context.
 *  Returns data needed by the SSE route to stream the response. */
export async function prepareStreamContext(
  sessionId: string,
  userId: string,
  content: string,
): Promise<{
  userMsg: ChatMessage;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  kbContext: string;
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
  const historyRows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt));

  const history = historyRows.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const kbContext = await buildKbContext();

  return { userMsg: toMessage(userMsg!), history, kbContext };
}

/** Save complete AI response after streaming finishes */
export async function saveAssistantMessage(
  sessionId: string,
  fullContent: string,
): Promise<ChatMessage> {
  const [row] = await db
    .insert(chatMessages)
    .values({ sessionId, role: "assistant", content: fullContent, metadata: {} })
    .returning();
  return toMessage(row!);
}
