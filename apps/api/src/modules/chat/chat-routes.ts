import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { createChatSessionSchema, sendMessageSchema } from "@app/shared";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import * as chatService from "./chat-service.js";
import { generateChatResponseStream, type AggregatedUsage, type ToolCallEvent } from "./gemini-service.js";
import type { TokenUsage } from "./gemini-utils.js";

/**
 * Model pricing (USD per 1M tokens)
 * Source: https://ai.google.dev/pricing (paid tier, March 2026)
 */
const MODEL_PRICING = {
  "gemini-3-flash-preview": {
    inputPerMillion: 0.50,
    outputPerMillion: 3.00,
    cachedInputPerMillion: 0.25,
    thinkingPerMillion: 3.00,
  },
  "gemini-2.5-flash-lite": {
    inputPerMillion: 0.025,
    outputPerMillion: 0.15,
    cachedInputPerMillion: 0.0125,
    thinkingPerMillion: 0.00, // no thinking mode
  },
} as const;

type ModelId = keyof typeof MODEL_PRICING;

function estimateModelCost(usage: TokenUsage, model: ModelId) {
  const p = MODEL_PRICING[model];
  const regularInput = Math.max(0, usage.promptTokens - usage.cachedTokens);
  const inputCost = (regularInput / 1_000_000) * p.inputPerMillion;
  const cachedCost = (usage.cachedTokens / 1_000_000) * p.cachedInputPerMillion;
  const outputCost = (usage.responseTokens / 1_000_000) * p.outputPerMillion;
  const thinkingCost = (usage.thinkingTokens / 1_000_000) * p.thinkingPerMillion;
  const totalCost = inputCost + cachedCost + outputCost + thinkingCost;
  return { inputCost, cachedCost, outputCost, thinkingCost, totalCost };
}

function buildCostBreakdown(agg: AggregatedUsage) {
  const mainCost = estimateModelCost(agg.main, "gemini-3-flash-preview");
  const cheapCost = estimateModelCost(agg.cheap, "gemini-2.5-flash-lite");
  return {
    main: { model: "gemini-3-flash-preview", tokens: agg.main, cost: mainCost },
    cheap: { model: "gemini-2.5-flash-lite", tokens: agg.cheap, cost: cheapCost },
    toolRounds: agg.toolRounds,
    totalCost: mainCost.totalCost + cheapCost.totalCost,
  };
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
    user.role,
  );
  return c.json({ success: true, data: messages }, 201);
});

/** SSE streaming endpoint — streams AI response token-by-token */
chatRoutes.post("/sessions/:id/messages/stream", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const dto = sendMessageSchema.parse(body);

  // Prepare context: save user msg, fetch history + catalog
  const { userMsg, history, catalog } = await chatService.prepareStreamContext(
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

    // Stream AI response with turn tracking + token usage
    let fullContent = "";
    let aggregatedUsage: AggregatedUsage | null = null;
    const startTime = Date.now();
    const turnNumber = Math.ceil(history.length / 2);

    const onToolCall = async (event: ToolCallEvent) => {
      await stream.writeSSE({
        data: JSON.stringify({
          toolName: event.toolName,
          args: event.args,
          usedSkill: event.usedSkill,
        }),
        event: "tool-call",
        id: String(chunkId++),
      });
    };

    try {
      const gen = generateChatResponseStream(history, catalog, user.role, onToolCall, (u: AggregatedUsage) => { aggregatedUsage = u; });
      for await (const text of gen) {
        fullContent += text;
        await stream.writeSSE({
          data: JSON.stringify({ text }),
          event: "ai-chunk",
          id: String(chunkId++),
        });
      }

      const durationMs = Date.now() - startTime;
      const agg = aggregatedUsage as AggregatedUsage | null;
      const costBreakdown = agg ? buildCostBreakdown(agg) : null;

      // Build metadata with full processing details
      const usageMeta: Record<string, unknown> = {
        turn: turnNumber,
        durationMs,
        historyMessages: history.length,
        hasThinking: !!agg?.main.thinkingTokens,
      };
      if (costBreakdown) {
        usageMeta.costBreakdown = costBreakdown;
      }

      // Save complete response to DB with metadata
      const assistantMsg = await chatService.saveAssistantMessage(
        c.req.param("id"),
        fullContent,
        usageMeta,
      );

      // Send final event with all processing info
      await stream.writeSSE({
        data: JSON.stringify({
          ...assistantMsg,
          costBreakdown,
          turn: turnNumber,
          durationMs,
          hasThinking: !!agg?.main.thinkingTokens,
        }),
        event: "ai-complete",
        id: String(chunkId++),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI generation failed";
      console.error("[chat-stream] Gemini error:", err);
      await stream.writeSSE({
        data: JSON.stringify({ error: message }),
        event: "error",
        id: String(chunkId++),
      });
    }
  });
});
