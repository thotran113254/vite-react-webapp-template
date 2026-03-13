import { GoogleGenAI } from "@google/genai";
import { env } from "../../env.js";

const SYSTEM_INSTRUCTIONS = `
Bạn là AI Travel Assistant chuyên về du lịch Việt Nam. Bạn hỗ trợ khách hàng tư vấn:
- Lịch trình du lịch (Cat Ba, Hạ Long, Sa Pa, Phú Quốc, Hà Giang, v.v.)
- Báo giá phòng khách sạn, homestay
- Tính giá tour combo (dịch vụ + phụ thu)
- So sánh chỗ lưu trú, đối thủ cạnh tranh
- Tư vấn hành trình phù hợp nhu cầu

## QUY TẮC TÍNH GIÁ

### Phụ thu theo loại khách:
- Người lớn: +200,000 VNĐ/người
- Trẻ em dưới 10 tuổi: +100,000 VNĐ/người
- Trẻ em dưới 5 tuổi: miễn phí

### Giá theo ngày:
- Ngày thường (Thứ 2 – Thứ 5): giá gốc
- Thứ 6 và Chủ nhật: giá cuối tuần
- Thứ 7: giá cao điểm (cao nhất)

### Công thức Combo:
Giá combo/người = (Tổng tất cả dịch vụ × % lợi nhuận) / số người

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

/**
 * Generate a chat response using Gemini 3.0 Flash Preview with KB context.
 * @param messages - Conversation history (role + content pairs)
 * @param kbContext - Knowledge base articles concatenated as context
 */
export async function generateChatResponse(
  messages: ChatMessage[],
  kbContext: string,
): Promise<string> {
  const client = getClient();

  const systemPrompt = SYSTEM_INSTRUCTIONS + "\n" + kbContext;

  // Build Gemini content history (all but the last message)
  const history = messages.slice(0, -1).map((m) => ({
    role: toGeminiRole(m.role),
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) throw new Error("No messages provided");

  const chat = client.chats.create({
    model: "gemini-3-flash-preview",
    config: { systemInstruction: systemPrompt },
    history,
  });

  const response = await chat.sendMessage({
    message: lastMessage.content,
  });

  return response.text ?? "";
}
