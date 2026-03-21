// ─── Token Usage ─────────────────────────────────────────────────────────────

export interface TokenUsage {
  promptTokens: number;
  responseTokens: number;
  thinkingTokens: number;
  cachedTokens: number;
  totalTokens: number;
}

interface GeminiUsageMeta {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  cachedContentTokenCount?: number;
  totalTokenCount?: number;
}

export function extractUsage(chunk: unknown): TokenUsage | null {
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

/** Extract usage from a generateContent response object */
export function extractResponseUsage(response: unknown): TokenUsage | null {
  return extractUsage(response);
}

export function emptyUsage(): TokenUsage {
  return { promptTokens: 0, responseTokens: 0, thinkingTokens: 0, cachedTokens: 0, totalTokens: 0 };
}

/** Sum two TokenUsage objects together */
export function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    promptTokens: a.promptTokens + b.promptTokens,
    responseTokens: a.responseTokens + b.responseTokens,
    thinkingTokens: a.thinkingTokens + b.thinkingTokens,
    cachedTokens: a.cachedTokens + b.cachedTokens,
    totalTokens: a.totalTokens + b.totalTokens,
  };
}

/** Aggregated usage across all models in a single chat turn */
export interface AggregatedUsage {
  /** Main model (gemini-3-flash-preview) accumulated across all rounds */
  main: TokenUsage;
  /** Cheap model (gemini-2.5-flash-lite) accumulated from skill processing */
  cheap: TokenUsage;
  /** Number of tool call rounds executed */
  toolRounds: number;
}

// ─── Date context ────────────────────────────────────────────────────────────

export function buildDateContext(): string {
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

// ─── System prompt ───────────────────────────────────────────────────────────

const SYSTEM_INSTRUCTIONS = `Bạn là AI trợ lý nội bộ cho nhân viên sale du lịch. Nhiệm vụ: giúp sale tra cứu nhanh và tư vấn khách hàng chính xác.

## VAI TRÒ
- Người dùng là NHÂN VIÊN SALE, không phải khách du lịch
- Trả lời ngắn gọn, đi thẳng vào dữ liệu, dễ copy-paste gửi khách
- Khi báo giá: format dạng bảng/danh sách rõ ràng để sale gửi khách luôn
- Gợi ý câu trả lời mẫu sale có thể gửi khách khi được hỏi

## QUY TẮC TRA CỨU (BẮT BUỘC)
1. LUÔN gọi tool tra dữ liệu TRƯỚC KHI trả lời. KHÔNG bịa giá, KHÔNG đoán.
2. Khi tính giá: gọi getPropertyPricing(slug, propertySlug), dùng số liệu chính xác từ hệ thống
3. Khi so sánh: gọi compareProperties([items]) — 1 lần gọi cho tất cả cơ sở cần so sánh
4. Khi tìm kiếm cross-market: gọi searchProperties(filters) — tìm xuyên tất cả thị trường
5. Nếu sale hỏi thị trường KHÔNG CÓ trong danh sách [THỊ TRƯỜNG]: nói rõ "Hệ thống chưa có dữ liệu [tên], hiện chỉ có: [liệt kê thị trường có sẵn]". KHÔNG hỏi thêm thông tin khi thị trường không tồn tại.
6. Khi quote giá: GHI RÕ loại combo, loại ngày, số người tiêu chuẩn, phụ thu nếu có
7. Hỏi lại nếu sale chưa cung cấp đủ: thị trường, số người, ngày check-in, số đêm
8. Chính sách trẻ em, phụ thu, vận chuyển: gọi getMarketBusinessData (chứa pricingConfigs)

## CHỐNG BỊA DỮ LIỆU (TUYỆT ĐỐI TUÂN THỦ)
- CHỈ đề cập khách sạn, resort, homestay, cơ sở lưu trú có trong kết quả tool. KHÔNG BAO GIỜ tự thêm tên cơ sở lưu trú từ kiến thức bên ngoài.
- Nếu tool trả về 2 cơ sở → chỉ nói về 2 cơ sở đó. KHÔNG bịa thêm cơ sở thứ 3.
- Danh sách cơ sở lưu trú mỗi thị trường được liệt kê trong mục [THỊ TRƯỜNG] bên dưới. Nếu tên không có trong danh sách đó → KHÔNG đề cập.
- Nếu khách hỏi về cơ sở lưu trú không có trong hệ thống: trả lời "Hệ thống chưa có thông tin về [tên], hiện tại [thị trường] có: [liệt kê từ dữ liệu tool]".

## CHIẾN LƯỢC TRA CỨU THÔNG MINH (Progressive — từ tổng quan đến chi tiết)

### A. Tra cứu 1 thị trường (phổ biến nhất):
1. Xác định thị trường → nếu chưa rõ, hỏi lại. Nếu KHÔNG có trong [THỊ TRƯỜNG] → thông báo ngay.
2. getMarketOverview(slug) → danh sách cơ sở (tên, loại, sao).
3. Thu hẹp: hỏi khách loại hình, ngân sách, số người, ngày đi.
4. getPropertyDetails(slug, propertySlug) → chi tiết cơ sở cụ thể.
5. getPropertyPricing(slug, propertySlug, comboType?, dayType?) → báo giá.

### B. So sánh cơ sở (khi khách phân vân):
1. Xác định các cơ sở cần so sánh (từ context hoặc hỏi sale).
2. compareProperties([{slug, propertySlug}, ...], comboType?, dayType?) → so sánh side-by-side 1 lần gọi.
3. Tóm tắt ưu/nhược và gợi ý lựa chọn phù hợp.

### C. Tìm kiếm cross-market (khi chưa xác định thị trường):
1. searchProperties(type?, starMin?, region?, capacity?) → tìm xuyên tất cả thị trường.
2. Gợi ý top 2-3 kết quả phù hợp nhất.
3. Nếu sale muốn chi tiết → getPropertyDetails hoặc compareProperties.

KHÔNG gọi tất cả tools cùng lúc. Chỉ gọi tool khi cần thông tin ở bước tiếp theo.
Ưu tiên lọc bằng propertySlug khi có thể — tránh tải toàn bộ dữ liệu.

## GỢI Ý HỎI THÊM
Khi khách hỏi chung chung, hỏi lại để thu hẹp:
- "Anh/chị muốn ở loại hình nào? Homestay bình dân, khách sạn hay resort cao cấp?"
- "Đoàn bao nhiêu người ạ? Đi ngày nào?"
- "Ngân sách khoảng bao nhiêu/đêm ạ?"
Sau khi có đủ thông tin → tra cứu chính xác và gợi ý 1-2 lựa chọn phù hợp nhất.

## HƯỚNG DẪN TÍNH GIÁ
- NGÀY CHECK-IN → LOẠI NGÀY: T2-T5=weekday, T6=friday, T7=saturday, CN=sunday
- SỐ ĐÊM → LOẠI COMBO: 1 đêm=2n1d, 2 đêm=3n2d, linh hoạt=per_night
- "cuối tuần" → check-in T6 hoặc T7
- Xem bảng giá phòng: getPropertyPricing(slug, propertySlug) với filters
- BÁO GIÁ COMBO TRỌN GÓI (phòng + xe + tàu): dùng calculateComboPrice
  - Khi có nhiều đêm KHÁC loại ngày (VD: T5+T6+T7) → dùng dayTypes: ["weekday","friday","saturday"]
  - Khi khách chỉ đi 1 chiều → tripType: "oneway"
  - Khi khách từ tỉnh khác (VD: Quảng Ninh) → departureProvince: "Quảng Ninh" để tính phụ thu
  - Cần tối thiểu: marketSlug, numAdults, numNights
  - dayTypes ưu tiên hơn dayType khi cả 2 đều có

## FORMAT TRẢ LỜI
- Giá: format VND có dấu chấm (vd: 2.800.000₫)
- Bảng giá: dùng markdown table khi có nhiều mức giá
- Gợi ý upsell: nếu khách hỏi phòng rẻ → gợi ý thêm phòng tốt hơn chênh ít
- Cuối câu trả lời: gợi ý sale hỏi thêm gì hoặc chốt deal`;

/** Fallback prompt builder — uses hardcoded SYSTEM_INSTRUCTIONS (for backward compat) */
export function buildSystemPrompt(catalog: string): string {
  const dateContext = buildDateContext();
  return `## NGÀY HIỆN TẠI\n${dateContext}\n\n${SYSTEM_INSTRUCTIONS}\n\n## DỮ LIỆU CÓ SẴN\n${catalog}\n\nDùng tools bên dưới để tra cứu chi tiết. KHÔNG bao giờ đoán giá hoặc thông tin.`;
}

/** DB-driven prompt builder — reads prompt sections + creativity rules from admin config.
 *  Falls back to hardcoded SYSTEM_INSTRUCTIONS if DB has no prompt configs yet. */
export async function buildSystemPromptFromDb(catalog: string): Promise<string> {
  // Lazy import to avoid circular dependency
  const { getAllPromptSections, buildCreativityInstructions } = await import("./ai-chat-config-service.js");

  const dateContext = buildDateContext();
  const promptSections = await getAllPromptSections();

  // If DB has admin-configured prompt sections, assemble from those
  const customRole = promptSections.get("prompt_role");
  const customLookupRules = promptSections.get("prompt_lookup_rules");
  const customAntiHallucination = promptSections.get("prompt_anti_hallucination");
  const customStrategy = promptSections.get("prompt_progressive_strategy");
  const customQuestioning = promptSections.get("prompt_questioning");
  const customPriceGuide = promptSections.get("prompt_price_guide");
  const customResponseFormat = promptSections.get("prompt_response_format");

  // Build creativity rules from per-category settings in ai_data_settings
  const creativityRules = await buildCreativityInstructions();

  // If no custom prompts in DB → fallback to hardcoded
  const hasCustomPrompts = customRole || customLookupRules || customStrategy;
  if (!hasCustomPrompts) {
    return `## NGÀY HIỆN TẠI\n${dateContext}\n\n${SYSTEM_INSTRUCTIONS}${creativityRules}\n\n## DỮ LIỆU CÓ SẴN\n${catalog}\n\nDùng tools bên dưới để tra cứu chi tiết. KHÔNG bao giờ đoán giá hoặc thông tin.`;
  }

  // Assemble from DB sections
  let prompt = `## NGÀY HIỆN TẠI\n${dateContext}\n\n`;
  if (customRole) prompt += `${customRole}\n\n`;
  if (customLookupRules) prompt += `## QUY TẮC TRA CỨU\n${customLookupRules}\n\n`;
  if (customAntiHallucination) prompt += `## CHỐNG BỊA DỮ LIỆU\n${customAntiHallucination}\n\n`;
  if (customStrategy) prompt += `## CHIẾN LƯỢC TRA CỨU\n${customStrategy}\n\n`;
  if (customQuestioning) prompt += `## GỢI Ý HỎI THÊM\n${customQuestioning}\n\n`;
  if (customPriceGuide) prompt += `## HƯỚNG DẪN TÍNH GIÁ\n${customPriceGuide}\n\n`;
  if (customResponseFormat) prompt += `## FORMAT TRẢ LỜI\n${customResponseFormat}\n\n`;
  prompt += creativityRules;
  prompt += `\n## DỮ LIỆU CÓ SẴN\n${catalog}\n\nDùng tools bên dưới để tra cứu chi tiết. KHÔNG bao giờ đoán giá hoặc thông tin.`;

  return prompt;
}
