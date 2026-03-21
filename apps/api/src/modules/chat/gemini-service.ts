import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { Content, Part } from "@google/genai";
import { env } from "../../env.js";
import { GEMINI_TOOLS } from "./gemini-tool-definitions.js";
import { executeToolCall } from "./gemini-tool-handlers.js";
import { getSkillForToolAsync } from "./skills/index.js";
import { needsProcessing, processWithSkill } from "./gemini-cheap-model.js";
import { getModelConfig } from "./ai-chat-config-service.js";
import { buildSystemPromptFromDb } from "./gemini-utils.js";
import {
  extractUsage, extractResponseUsage,
  emptyUsage, addUsage,
  type TokenUsage, type AggregatedUsage,
} from "./gemini-utils.js";

export type { TokenUsage, AggregatedUsage };

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

// ─── Client singleton ─────────────────────────────────────────────────────────

let genai: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!genai) {
    if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");
    genai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return genai;
}

// ─── History conversion ───────────────────────────────────────────────────────

/** Parse data:image/png;base64,... into inline data Part */
function parseImageDataUrl(dataUrl: string): Part | null {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/s);
  if (!match) return null;
  return { inlineData: { mimeType: match[1]!, data: match[2]! } };
}

function toContents(messages: ChatMessage[]): Content[] {
  return messages.map((m) => {
    const parts: Part[] = [{ text: m.content }];
    // Add image parts from metadata (if this message had images)
    const images = (m as unknown as Record<string, unknown>).images as string[] | undefined;
    if (images?.length) {
      for (const img of images) {
        const part = parseImageDataUrl(img);
        if (part) parts.push(part);
      }
    }
    return {
      role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
      parts,
    };
  });
}

// ─── Thinking level mapping ──────────────────────────────────────────────────

function parseThinkingLevel(level: string): ThinkingLevel {
  const map: Record<string, ThinkingLevel> = {
    LOW: ThinkingLevel.LOW,
    MEDIUM: ThinkingLevel.MEDIUM,
    HIGH: ThinkingLevel.HIGH,
  };
  return map[level.toUpperCase()] ?? ThinkingLevel.LOW;
}

// ─── Tool call events ─────────────────────────────────────────────────────────

/** Info about a tool call execution — sent to frontend via SSE */
export interface ToolCallEvent {
  toolName: string;
  args: Record<string, unknown>;
  usedSkill: boolean;
}

/** Result of resolving tool calls — includes cheap model token usage */
interface ToolResolveResult {
  parts: Part[];
  cheapUsage: TokenUsage;
}

/** Execute tool calls, route through cheap model if data is large */
async function resolveToolCalls(
  functionCalls: Array<{ name: string; args: Record<string, unknown> }>,
  userQuestion: string,
  userRole: string,
  onToolCall?: (event: ToolCallEvent) => void,
): Promise<ToolResolveResult> {
  let cheapUsage = emptyUsage();

  const results = await Promise.all(
    functionCalls.map(async (fc) => {
      let result = await executeToolCall(fc.name, fc.args, userRole);
      let usedSkill = false;

      if (needsProcessing(result)) {
        const resolved = await getSkillForToolAsync(fc.name);
        if (resolved) {
          const skillResult = await processWithSkill(resolved.prompt, userQuestion, result, resolved.modelConfig);
          result = skillResult.text;
          if (skillResult.usage) cheapUsage = addUsage(cheapUsage, skillResult.usage);
          usedSkill = true;
        }
      }

      onToolCall?.({ toolName: fc.name, args: fc.args, usedSkill });
      return { name: fc.name, result };
    }),
  );

  const parts = results.map(({ name, result }) => ({
    functionResponse: { name, response: { result } },
  })) as Part[];

  return { parts, cheapUsage };
}

// ─── Main streaming entry point ───────────────────────────────────────────────

/**
 * Generate streaming chat response with tool-call orchestration.
 * Reads model config from DB (admin-configurable).
 */
export async function* generateChatResponseStream(
  messages: ChatMessage[],
  catalog: string,
  userRole: string,
  onToolCall?: (event: ToolCallEvent) => void,
  onUsage?: (usage: AggregatedUsage) => void,
): AsyncGenerator<string> {
  const client = getClient();

  // Read admin-configurable model settings from DB
  const modelConfig = await getModelConfig();
  const systemInstruction = await buildSystemPromptFromDb(catalog);
  const contents = toContents(messages);
  const config = {
    tools: GEMINI_TOOLS,
    systemInstruction,
    temperature: modelConfig.temperature,
    thinkingConfig: { thinkingLevel: parseThinkingLevel(modelConfig.thinkingLevel) },
  };

  const userQuestion = messages[messages.length - 1]?.content ?? "";

  // Accumulate usage across all rounds
  let mainUsage = emptyUsage();
  let cheapUsage = emptyUsage();
  let toolRounds = 0;

  for (let round = 0; round < modelConfig.maxToolRounds; round++) {
    const response = await client.models.generateContent({
      model: modelConfig.modelName,
      contents,
      config,
    });

    // Accumulate main model usage from this tool round
    const roundUsage = extractResponseUsage(response);
    if (roundUsage) mainUsage = addUsage(mainUsage, roundUsage);

    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      toolRounds++;

      // Preserve original model parts (includes thought_signature required by thinking mode)
      const modelContent = response.candidates?.[0]?.content;
      if (modelContent) {
        contents.push(modelContent);
      }

      const toolResult = await resolveToolCalls(
        functionCalls.map((fc) => ({
          name: fc.name ?? "",
          args: (fc.args ?? {}) as Record<string, unknown>,
        })),
        userQuestion,
        userRole,
        onToolCall,
      );

      cheapUsage = addUsage(cheapUsage, toolResult.cheapUsage);
      contents.push({ role: "user", parts: toolResult.parts });
      continue;
    }

    // No more tool calls — stream the final text response
    const stream = await client.models.generateContentStream({
      model: modelConfig.modelName,
      contents,
      config,
    });

    let lastChunk: unknown = null;
    for await (const chunk of stream) {
      lastChunk = chunk;
      const text = chunk.text;
      if (text) yield text;
    }

    // Add final stream usage to accumulated total
    if (lastChunk) {
      const streamUsage = extractUsage(lastChunk);
      if (streamUsage) mainUsage = addUsage(mainUsage, streamUsage);
    }

    onUsage?.({ main: mainUsage, cheap: cheapUsage, toolRounds });
    return;
  }

  onUsage?.({ main: mainUsage, cheap: cheapUsage, toolRounds });
  yield "Xin lỗi, hệ thống gặp sự cố khi tra cứu dữ liệu. Vui lòng thử lại.";
}

/** Non-streaming fallback — collects stream into single string */
export async function generateChatResponse(
  messages: ChatMessage[],
  catalog: string,
  userRole: string = "user",
): Promise<string> {
  let result = "";
  for await (const text of generateChatResponseStream(messages, catalog, userRole)) {
    result += text;
  }
  return result;
}
