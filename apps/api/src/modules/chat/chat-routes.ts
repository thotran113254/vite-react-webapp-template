import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { createChatSessionSchema, sendMessageSchema } from "@app/shared";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import * as chatService from "./chat-service.js";
import { generateChatResponseStream } from "./gemini-service.js";

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

    // Stream AI response chunks
    let fullContent = "";
    try {
      for await (const text of generateChatResponseStream(history, kbContext)) {
        fullContent += text;
        await stream.writeSSE({
          data: JSON.stringify({ text }),
          event: "ai-chunk",
          id: String(chunkId++),
        });
      }

      // Save complete response to DB
      const assistantMsg = await chatService.saveAssistantMessage(
        c.req.param("id"),
        fullContent,
      );

      // Send final event with complete message metadata
      await stream.writeSSE({
        data: JSON.stringify(assistantMsg),
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
