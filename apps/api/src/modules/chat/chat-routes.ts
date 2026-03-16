import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { createChatSessionSchema, sendMessageSchema } from "@app/shared";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import * as chatService from "./chat-service.js";
import { generateChatResponseStream, type TokenUsage } from "./gemini-service.js";

/**
 * Gemini 3 Flash Preview pricing (USD per 1M tokens)
 * Source: https://ai.google.dev/pricing (paid tier, March 2026)
 * - Cached input tokens are discounted (typically 50% off)
 * - Thinking tokens billed at output rate
 */
const PRICING = {
  inputPerMillion: 0.50,
  outputPerMillion: 3.00,
  cachedInputPerMillion: 0.25,
  thinkingPerMillion: 3.00,
} as const;

function estimateCost(usage: TokenUsage) {
  // Non-cached input tokens = prompt - cached
  const regularInput = Math.max(0, usage.promptTokens - usage.cachedTokens);
  const inputCost = (regularInput / 1_000_000) * PRICING.inputPerMillion;
  const cachedCost = (usage.cachedTokens / 1_000_000) * PRICING.cachedInputPerMillion;
  const outputCost = (usage.responseTokens / 1_000_000) * PRICING.outputPerMillion;
  const thinkingCost = (usage.thinkingTokens / 1_000_000) * PRICING.thinkingPerMillion;
  const totalCost = inputCost + cachedCost + outputCost + thinkingCost;
  return { inputCost, cachedCost, outputCost, thinkingCost, totalCost };
}

export const chatRoutes = new Hono();

chatRoutes.use("*", authMiddleware);

chatRoutes.get("/sessions", async (c) => {
  const user = c.get("user");
  const sessions = await chatService.listSessions(user.sub);
  return c.json({ success: true, data: sessions });
});

chatRoutes.post("/sessions", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const dto = createChatSessionSchema.parse(body);
  const session = await chatService.createSession(user.sub, dto.title);
  return c.json({ success: true, data: session }, 201);
});

chatRoutes.delete("/sessions/:id", async (c) => {
  const user = c.get("user");
  await chatService.deleteSession(c.req.param("id"), user.sub);
  return c.json({ success: true, message: "Session deleted" });
});

chatRoutes.get("/sessions/:id/messages", async (c) => {
  const user = c.get("user");
  const messages = await chatService.getMessages(c.req.param("id"), user.sub);
  return c.json({ success: true, data: messages });
});

/** Non-streaming fallback — kept for backward compatibility */
chatRoutes.post("/sessions/:id/messages", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const dto = sendMessageSchema.parse(body);
  const messages = await chatService.sendMessage(
    c.req.param("id"),
    user.sub,
    dto.content,
  );
  return c.json({ success: true, data: messages }, 201);
});

/** SSE streaming endpoint — streams AI response token-by-token */
chatRoutes.post("/sessions/:id/messages/stream", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const dto = sendMessageSchema.parse(body);

  // Prepare context: save user msg, fetch history + KB
  const { userMsg, history, kbContext } = await chatService.prepareStreamContext(
    c.req.param("id"),
    user.sub,
    dto.content,
  );

  return streamSSE(c, async (stream) => {
    let chunkId = 0;

    // Send user message confirmation first
    await stream.writeSSE({
      data: JSON.stringify(userMsg),
      event: "user-message",
      id: String(chunkId++),
    });

    // Stream AI response chunks with token usage tracking
    let fullContent = "";
    let tokenUsage: TokenUsage | null = null;

    try {
      const gen = generateChatResponseStream(history, kbContext, (u) => { tokenUsage = u; });
      for await (const text of gen) {
        fullContent += text;
        await stream.writeSSE({
          data: JSON.stringify({ text }),
          event: "ai-chunk",
          id: String(chunkId++),
        });
      }

      // Build metadata with token usage + cost estimate
      const usageMeta: Record<string, unknown> = {};
      if (tokenUsage) {
        const cost = estimateCost(tokenUsage);
        usageMeta.tokenUsage = tokenUsage;
        usageMeta.estimatedCost = cost;
        usageMeta.model = "gemini-3-flash-preview";
      }

      // Save complete response to DB with usage metadata
      const assistantMsg = await chatService.saveAssistantMessage(
        c.req.param("id"),
        fullContent,
        usageMeta,
      );

      // Send final event with message + usage info
      await stream.writeSSE({
        data: JSON.stringify({ ...assistantMsg, tokenUsage, estimatedCost: tokenUsage ? estimateCost(tokenUsage) : null }),
        event: "ai-complete",
        id: String(chunkId++),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI generation failed";
      await stream.writeSSE({
        data: JSON.stringify({ error: message }),
        event: "error",
        id: String(chunkId++),
      });
    }
  });
});
