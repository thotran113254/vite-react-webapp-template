import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { env } from "../../env.js";

/** Build current date/time context string in Vietnam timezone */
function buildDateContext(): string {
  const now = new Date();
  const vnFormatter = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const formatted = vnFormatter.format(now);

  // Get day of week number (0=CN, 1=T2, ..., 6=T7) in VN timezone
  const vnDay = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "short",
  }).format(now);
  const dayMap: Record<string, string> = {
    Mon: "T2", Tue: "T3", Wed: "T4", Thu: "T5",
    Fri: "T6", Sat: "T7", Sun: "CN",
  };
  const dayShort = dayMap[vnDay] ?? vnDay;

  return `Hôm nay: ${formatted} (${dayShort})\nTimezone: Asia/Ho_Chi_Minh (UTC+7)`;
}

const SYSTEM_INSTRUCTIONS = `
Bạn là AI Travel Assistant chuyên về du lịch Việt Nam cho nhân viên sale. Trả lời dựa trên DỮ LIỆU THỰC TẾ bên dưới.

## QUY TẮC
1. Khi tính giá: dùng BẢNG GIÁ CHÍNH XÁC trong dữ liệu, áp dụng quy tắc giá (trẻ em, phụ thu)
2. Khi so sánh: dùng bảng đánh giá tiêu chí (nếu có)
3. Khi gợi ý lịch trình: dùng LỊCH TRÌNH MẪU, tùy chỉnh theo yêu cầu KH
4. Nếu không có dữ liệu: nói rõ "chưa có thông tin trong hệ thống"
5. Trả lời bằng tiếng Việt, chuyên nghiệp, thân thiện
6. Khi quote giá: LUÔN ghi rõ loại combo, loại ngày, số người tiêu chuẩn

## HƯỚNG DẪN TÍNH GIÁ
- Xác định NGÀY CHECK-IN từ ý định khách (dùng "NGÀY HIỆN TẠI" bên dưới để tính ngày cụ thể)
- Map ngày check-in sang LOẠI NGÀY: T2-T5 → weekday, T6 → friday, T7 → saturday, CN → sunday, ngày lễ → holiday
- Xác định LOẠI COMBO từ số đêm khách muốn ở: 1 đêm → 2n1d, 2 đêm → 3n2d, linh hoạt → per_night
- Tra BẢNG GIÁ theo: phòng + combo type + day type → ra giá chính xác
- Nếu khách nói "cuối tuần" → check-in T6 hoặc T7, dùng day type tương ứng
- Nếu khách thêm/bớt người so với "số người tiêu chuẩn", áp dụng phụ thu +1ng hoặc giảm -1ng
- LUÔN hỏi lại nếu thiếu thông tin: số người, ngày đi, loại phòng

## KNOWLEDGE BASE (Dữ liệu thực tế từ hệ thống)
`;

type MessageRole = "user" | "assistant";

interface ChatMessage {
  role: MessageRole;
  content: string;
}

/** Map our role names to Gemini's role format */
function toGeminiRole(role: MessageRole): "user" | "model" {
  return role === "assistant" ? "model" : "user";
}

let genai: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!genai) {
    if (!env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    genai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return genai;
}

/** Build system prompt with date context and KB data */
function buildSystemPrompt(kbContext: string): string {
  const dateContext = buildDateContext();
  return `## NGÀY HIỆN TẠI\n${dateContext}\n\n` + SYSTEM_INSTRUCTIONS + "\n" + kbContext;
}

/** Build Gemini chat instance with history */
function createGeminiChat(messages: ChatMessage[], kbContext: string) {
  const client = getClient();
  const systemPrompt = buildSystemPrompt(kbContext);

  const history = messages.slice(0, -1).map((m) => ({
    role: toGeminiRole(m.role),
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) throw new Error("No messages provided");

  const chat = client.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: systemPrompt,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
    history,
  });

  return { chat, lastMessage: lastMessage.content };
}

/**
 * Generate a chat response (non-streaming) using Gemini.
 * Kept as fallback for non-SSE clients.
 */
export async function generateChatResponse(
  messages: ChatMessage[],
  kbContext: string,
): Promise<string> {
  const { chat, lastMessage } = createGeminiChat(messages, kbContext);
  const response = await chat.sendMessage({ message: lastMessage });
  return response.text ?? "";
}

/** Full token usage breakdown from Gemini API usageMetadata */
export interface TokenUsage {
  promptTokens: number;
  responseTokens: number;
  thinkingTokens: number;
  cachedTokens: number;
  totalTokens: number;
}

/** Raw Gemini usageMetadata shape */
interface GeminiUsageMeta {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  cachedContentTokenCount?: number;
  totalTokenCount?: number;
}

/** Extract token usage from Gemini response chunk */
function extractUsage(chunk: unknown): TokenUsage | null {
  const meta = (chunk as Record<string, unknown>)?.usageMetadata as GeminiUsageMeta | undefined;
  if (!meta) return null;
  return {
    promptTokens: meta.promptTokenCount ?? 0,
    responseTokens: meta.candidatesTokenCount ?? 0,
    thinkingTokens: meta.thoughtsTokenCount ?? 0,
    cachedTokens: meta.cachedContentTokenCount ?? 0,
    totalTokens: meta.totalTokenCount ?? 0,
  };
}

/**
 * Generate a streaming chat response using Gemini.
 * Yields text chunks as they arrive. Calls onUsage with full token breakdown when done.
 */
export async function* generateChatResponseStream(
  messages: ChatMessage[],
  kbContext: string,
  onUsage?: (usage: TokenUsage) => void,
): AsyncGenerator<string> {
  const { chat, lastMessage } = createGeminiChat(messages, kbContext);
  const stream = await chat.sendMessageStream({ message: lastMessage });

  let lastChunk: unknown = null;
  for await (const chunk of stream) {
    lastChunk = chunk;
    const text = chunk.text;
    if (text) yield text;
  }

  if (lastChunk && onUsage) {
    const usage = extractUsage(lastChunk);
    if (usage) onUsage(usage);
  }
}
