import { eq, desc, asc } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "../../db/connection.js";
import { chatSessions, chatMessages } from "../../db/schema/index.js";
import type { ChatSession, ChatMessage } from "@app/shared";
import { generateChatResponse } from "./gemini-service.js";
import { buildCatalog } from "../market-data/ai-context-builder.js";
import { saveImagesToDisk, urlsToBase64 } from "./chat-image-storage.js";

const MAX_HISTORY_MESSAGES = 30;

function toSession(row: typeof chatSessions.$inferSelect): ChatSession {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    isPinned: row.isPinned,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Update session title and/or pin state */
export async function updateSession(
  id: string,
  userId: string,
  updates: { title?: string; isPinned?: boolean },
): Promise<ChatSession> {
  const [session] = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, id))
    .limit(1);
  if (!session) throw new HTTPException(404, { message: "Session not found" });
  if (session.userId !== userId)
    throw new HTTPException(403, { message: "Access denied" });

  const setValues: Record<string, unknown> = {};
  if (updates.title !== undefined) setValues.title = updates.title;
  if (updates.isPinned !== undefined) setValues.isPinned = updates.isPinned;

  const [updated] = await db
    .update(chatSessions)
    .set(setValues)
    .where(eq(chatSessions.id, id))
    .returning();
  return toSession(updated!);
}

/** Auto-generate session title from first user message using a simple heuristic */
export function generateTitleFromMessage(content: string): string {
  // Take first 50 chars, clean up
  const clean = content.replace(/\n/g, " ").trim();
  if (clean.length <= 40) return clean;
  return clean.slice(0, 40).replace(/\s+\S*$/, "") + "...";
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

  await db
    .update(chatSessions)
    .set({ lastMessageAt: new Date() })
    .where(eq(chatSessions.id, sessionId));

  return [toMessage(userMsg!), toMessage(assistantMsg!)];
}

/** Prepare context for streaming: save user msg, build history + catalog.
 *  Returns data needed by the SSE route to stream the response. */
export async function prepareStreamContext(
  sessionId: string,
  userId: string,
  content: string,
  images?: string[],
): Promise<{
  userMsg: ChatMessage;
  history: Array<{ role: "user" | "assistant"; content: string; images?: string[] }>;
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

  // Save images to disk, store only URL paths in metadata (~50 bytes vs ~200KB per image)
  const metadata: Record<string, unknown> = {};
  if (images?.length) {
    const urls = await saveImagesToDisk(images);
    if (urls.length > 0) metadata.images = urls;
  }

  const [userMsg] = await db
    .insert(chatMessages)
    .values({ sessionId, role: "user", content, metadata })
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

  // For Gemini: convert image URL paths to base64 data URLs for the current message
  const imageUrls = metadata.images as string[] | undefined;
  const geminiImages = imageUrls?.length ? await urlsToBase64(imageUrls) : undefined;
  const historyWithImages = history.map((m, i) => {
    if (i === history.length - 1 && geminiImages?.length) {
      return { ...m, images: geminiImages };
    }
    return m;
  });

  const catalog = await buildCatalog();

  return { userMsg: toMessage(userMsg!), history: historyWithImages, catalog };
}

/** Save complete AI response with optional token usage metadata */
export async function saveAssistantMessage(
  sessionId: string,
  fullContent: string,
  metadata?: Record<string, unknown>,
): Promise<ChatMessage> {
  const now = new Date();
  const [row] = await db
    .insert(chatMessages)
    .values({ sessionId, role: "assistant", content: fullContent, metadata: metadata ?? {} })
    .returning();
  // Update lastMessageAt so analytics can track session activity
  await db
    .update(chatSessions)
    .set({ lastMessageAt: now })
    .where(eq(chatSessions.id, sessionId));
  return toMessage(row!);
}
