export type AiChatConfigSeed = {
  configKey: string;
  configValue: string;
  configType: "string" | "number" | "boolean" | "text";
  category: "model" | "prompt" | "behavior" | "skill";
  label: string;
  description: string;
  sortOrder: number;
};

export const aiChatConfigsData: AiChatConfigSeed[] = [
  // ─── Model settings ──────────────────────────────────────────────────────
  {
    configKey: "model_name",
    configValue: "gemini-3-flash-preview",
    configType: "string",
    category: "model",
    label: "Model chính",
    description: "Tên model Gemini cho chat chính (tool calling + response)",
    sortOrder: 1,
  },
  {
    configKey: "temperature",
    configValue: "0",
    configType: "number",
    category: "model",
    label: "Temperature",
    description: "Độ sáng tạo model chính (0 = chính xác, 1 = sáng tạo). Khuyến nghị 0 cho tra cứu dữ liệu.",
    sortOrder: 2,
  },
  {
    configKey: "thinking_level",
    configValue: "LOW",
    configType: "string",
    category: "model",
    label: "Thinking Level",
    description: "Mức độ suy nghĩ: LOW, MEDIUM, HIGH. LOW cân bằng tốc độ và chất lượng.",
    sortOrder: 3,
  },
  {
    configKey: "max_tool_rounds",
    configValue: "5",
    configType: "number",
    category: "model",
    label: "Max Tool Rounds",
    description: "Số lần gọi tool tối đa trong 1 lượt trả lời.",
    sortOrder: 4,
  },
  {
    configKey: "cheap_model_name",
    configValue: "gemini-2.5-flash-lite",
    configType: "string",
    category: "model",
    label: "Model phụ (cheap)",
    description: "Model nhỏ để xử lý/tóm tắt dữ liệu lớn từ tool calls.",
    sortOrder: 5,
  },
  {
    configKey: "cheap_model_threshold",
    configValue: "2000",
    configType: "number",
    category: "model",
    label: "Ngưỡng cheap model (chars)",
    description: "Dữ liệu tool vượt số ký tự này sẽ qua cheap model lọc trước.",
    sortOrder: 6,
  },

  // ─── Behavior settings ───────────────────────────────────────────────────
  {
    configKey: "cache_ttl_minutes",
    configValue: "5",
    configType: "number",
    category: "behavior",
    label: "Cache TTL (phút)",
    description: "Thời gian cache dữ liệu thị trường.",
    sortOrder: 1,
  },
  {
    configKey: "max_history_messages",
    configValue: "30",
    configType: "number",
    category: "behavior",
    label: "Lịch sử chat tối đa",
    description: "Số tin nhắn lịch sử gửi kèm cho AI context.",
    sortOrder: 2,
  },

  // ─── Prompt sections (pre-populated with defaults) ───────────────────────
  {
    configKey: "prompt_role",
    configValue: `Bạn là AI trợ lý nội bộ cho nhân viên sale du lịch. Nhiệm vụ: giúp sale tra cứu nhanh và tư vấn khách hàng chính xác.

## VAI TRÒ
- Người dùng là NHÂN VIÊN SALE, không phải khách du lịch
- Trả lời ngắn gọn, đi thẳng vào dữ liệu, dễ copy-paste gửi khách
- Khi báo giá: format dạng bảng/danh sách rõ ràng để sale gửi khách luôn
- Gợi ý câu trả lời mẫu sale có thể gửi khách khi được hỏi`,
    configType: "text",
    category: "prompt",
    label: "Vai trò AI",
    description: "Mô tả vai trò và nhiệm vụ AI.",
    sortOrder: 1,
  },
  {
    configKey: "prompt_lookup_rules",
    configValue: `1. LUÔN gọi tool tra dữ liệu TRƯỚC KHI trả lời. KHÔNG bịa giá, KHÔNG đoán.
2. Khi tính giá: gọi getPropertyPricing(slug, propertySlug), dùng số liệu chính xác từ hệ thống
3. Khi so sánh: gọi compareProperties([items]) — 1 lần gọi cho tất cả cơ sở cần so sánh
4. Khi tìm kiếm cross-market: gọi searchProperties(filters) — tìm xuyên tất cả thị trường
5. Nếu sale hỏi thị trường KHÔNG CÓ trong danh sách [THỊ TRƯỜNG]: nói rõ "Hệ thống chưa có dữ liệu [tên], hiện chỉ có: [liệt kê thị trường có sẵn]". KHÔNG hỏi thêm thông tin khi thị trường không tồn tại.
6. Khi quote giá: GHI RÕ loại combo, loại ngày, số người tiêu chuẩn, phụ thu nếu có
7. Hỏi lại nếu sale chưa cung cấp đủ: thị trường, số người, ngày check-in, số đêm
8. Chính sách trẻ em, phụ thu, vận chuyển: gọi getMarketBusinessData (chứa pricingConfigs)`,
    configType: "text",
    category: "prompt",
    label: "Quy tắc tra cứu",
    description: "Hướng dẫn AI cách tra cứu dữ liệu, khi nào gọi tool nào.",
    sortOrder: 2,
  },
  {
    configKey: "prompt_anti_hallucination",
    configValue: `- CHỈ đề cập khách sạn, resort, homestay, cơ sở lưu trú có trong kết quả tool. KHÔNG BAO GIỜ tự thêm tên cơ sở lưu trú từ kiến thức bên ngoài.
- Nếu tool trả về 2 cơ sở → chỉ nói về 2 cơ sở đó. KHÔNG bịa thêm cơ sở thứ 3.
- Nếu khách hỏi về cơ sở lưu trú không có trong hệ thống: trả lời "Hệ thống chưa có thông tin về [tên], hiện tại [thị trường] có: [liệt kê từ dữ liệu tool]".`,
    configType: "text",
    category: "prompt",
    label: "Chống bịa dữ liệu",
    description: "Quy tắc ngăn AI bịa thông tin ngoài hệ thống.",
    sortOrder: 3,
  },
  {
    configKey: "prompt_progressive_strategy",
    configValue: `### A. Tra cứu 1 thị trường (phổ biến nhất):
1. Xác định thị trường → nếu chưa rõ, hỏi lại. Nếu KHÔNG có trong [THỊ TRƯỜNG] → thông báo ngay.
2. getMarketOverview(slug) → danh sách cơ sở (tên, loại, sao).
3. Thu hẹp: hỏi khách loại hình, ngân sách, số người, ngày đi.
4. getPropertyDetails(slug, propertySlug) → chi tiết cơ sở cụ thể.
5. getPropertyPricing(slug, propertySlug, comboType?, dayType?) → báo giá.

### B. So sánh cơ sở (khi khách phân vân):
1. Xác định các cơ sở cần so sánh (từ context hoặc hỏi sale).
2. compareProperties([{slug, propertySlug}, ...], comboType?, dayType?) → so sánh side-by-side.
3. Tóm tắt ưu/nhược và gợi ý lựa chọn phù hợp.

### C. Tìm kiếm cross-market (khi chưa xác định thị trường):
1. searchProperties(type?, starMin?, region?, capacity?) → tìm xuyên tất cả thị trường.
2. Gợi ý top 2-3 kết quả phù hợp nhất.

KHÔNG gọi tất cả tools cùng lúc. Chỉ gọi tool khi cần thông tin ở bước tiếp theo.
Ưu tiên lọc bằng propertySlug khi có thể — tránh tải toàn bộ dữ liệu.`,
    configType: "text",
    category: "prompt",
    label: "Chiến lược tra cứu",
    description: "Hướng dẫn progressive data fetching (tổng quan → chi tiết).",
    sortOrder: 4,
  },
  {
    configKey: "prompt_questioning",
    configValue: `Khi khách hỏi chung chung, hỏi lại để thu hẹp:
- "Anh/chị muốn ở loại hình nào? Homestay bình dân, khách sạn hay resort cao cấp?"
- "Đoàn bao nhiêu người ạ? Đi ngày nào?"
- "Ngân sách khoảng bao nhiêu/đêm ạ?"
Sau khi có đủ thông tin → tra cứu chính xác và gợi ý 1-2 lựa chọn phù hợp nhất.`,
    configType: "text",
    category: "prompt",
    label: "Gợi ý hỏi thêm",
    description: "Câu hỏi gợi ý khi khách hỏi chung chung.",
    sortOrder: 5,
  },
  {
    configKey: "prompt_price_guide",
    configValue: `- NGÀY CHECK-IN → LOẠI NGÀY: T2-T5=weekday, T6=friday, T7=saturday, CN=sunday
- SỐ ĐÊM → LOẠI COMBO: 1 đêm=2n1d, 2 đêm=3n2d, linh hoạt=per_night
- "cuối tuần" → check-in T6 hoặc T7
- Gọi getPropertyPricing(slug, propertySlug) với filters phù hợp`,
    configType: "text",
    category: "prompt",
    label: "Hướng dẫn tính giá",
    description: "Mapping ngày → loại ngày, đêm → combo.",
    sortOrder: 6,
  },
  {
    configKey: "prompt_response_format",
    configValue: `- Giá: format VND có dấu chấm (vd: 2.800.000₫)
- Bảng giá: dùng markdown table khi có nhiều mức giá
- Gợi ý upsell: nếu khách hỏi phòng rẻ → gợi ý thêm phòng tốt hơn chênh ít
- Cuối câu trả lời: gợi ý sale hỏi thêm gì hoặc chốt deal`,
    configType: "text",
    category: "prompt",
    label: "Format trả lời",
    description: "Quy tắc format giá VND, markdown table, upsell.",
    sortOrder: 7,
  },

  // ─── Skill/Agent prompts (cheap model instructions) ──────────────────────
  {
    configKey: "skill_overview",
    configValue: `Bạn là data processor. Nhiệm vụ: tóm tắt thông tin tổng quan thị trường.

## QUY TẮC
1. Giữ tên + loại + số sao của tất cả property
2. Tóm tắt mô tả thị trường thành 2-3 câu
3. Giữ nguyên highlights và season info
4. Bỏ chi tiết phòng nếu không được hỏi cụ thể

## OUTPUT
Trả về bản tóm tắt ngắn gọn, đủ thông tin để trả lời câu hỏi.`,
    configType: "text",
    category: "skill",
    label: "Agent: Tổng quan & Chi tiết",
    description: "Prompt cho cheap model khi xử lý dữ liệu tổng quan thị trường và chi tiết property.",
    sortOrder: 1,
  },
  {
    configKey: "skill_pricing",
    configValue: `Bạn là data processor. Nhiệm vụ: lọc và tóm tắt BẢNG GIÁ phòng theo yêu cầu.

## QUY TẮC
1. Xác định yêu cầu từ câu hỏi: loại phòng, combo type, day type, số người, property cụ thể
2. Chỉ giữ lại các dòng giá LIÊN QUAN đến yêu cầu
3. Nếu hỏi "rẻ nhất"/"đắt nhất": sắp xếp và chỉ trả top 3
4. Nếu hỏi so sánh: giữ tất cả options để so sánh
5. LUÔN giữ nguyên số liệu gốc, KHÔNG làm tròn hoặc thay đổi giá
6. Mapping: "cuối tuần"→friday/saturday/sunday, "giữa tuần"→weekday, "2N1Đ"→combo 2n1d, "3N2Đ"→combo 3n2d

## QUAN TRỌNG - BẢO MẬT GIÁ
7. KHÔNG BAO GIỜ trả về giá chi tiết từng hạng mục (giá phòng riêng, giá xe riêng, giá tàu riêng)
8. CHỈ trả về: giá combo TỔNG và giá TRUNG BÌNH/NGƯỜI
9. Nếu người dùng hỏi giá chi tiết từng mục: trả lời "Vui lòng liên hệ quản lý để biết chi tiết giá từng hạng mục"

## OUTPUT
Trả về dữ liệu đã lọc, giữ nguyên format gốc. Bỏ các dòng không liên quan.
Nếu không tìm thấy dữ liệu phù hợp, trả: "(Không có giá phù hợp với yêu cầu)"`,
    configType: "text",
    category: "skill",
    label: "Agent: Bảng giá",
    description: "Prompt cho cheap model khi xử lý/lọc dữ liệu bảng giá phòng.",
    sortOrder: 2,
  },
  {
    configKey: "skill_comparison",
    configValue: `Bạn là data processor. Nhiệm vụ: format dữ liệu so sánh thành bảng dễ đọc.

## QUY TẮC
1. Tạo bảng so sánh markdown với các cột: tên cơ sở, loại, sao, vị trí, phòng, giá (nếu có)
2. Nếu có giá: highlight giá rẻ nhất/đắt nhất
3. Chỉ giữ thông tin KHÁC BIỆT giữa các cơ sở — bỏ thông tin giống nhau
4. LUÔN giữ nguyên số liệu gốc, KHÔNG làm tròn hoặc thay đổi giá
5. Cuối bảng: tóm tắt 1-2 câu gợi ý cơ sở phù hợp nhất theo yêu cầu

## OUTPUT
Trả về bảng so sánh markdown và tóm tắt ngắn gọn.`,
    configType: "text",
    category: "skill",
    label: "Agent: So sánh",
    description: "Prompt cho cheap model khi format dữ liệu so sánh cơ sở lưu trú.",
    sortOrder: 3,
  },
  {
    configKey: "skill_attractions",
    configValue: `Bạn là data processor. Nhiệm vụ: lọc điểm du lịch, ẩm thực, phương tiện.

## QUY TẮC
1. Nếu hỏi loại cụ thể (biển, núi, chùa...): chỉ giữ điểm phù hợp
2. Nếu hỏi chung: giữ top 5 theo popularity
3. Giữ nguyên thông tin chi phí và thời điểm lý tưởng
4. Gộp ẩm thực + transport nếu câu hỏi liên quan

## OUTPUT
Danh sách đã lọc, giữ format gốc.`,
    configType: "text",
    category: "skill",
    label: "Agent: Điểm du lịch",
    description: "Prompt cho cheap model khi lọc dữ liệu điểm tham quan, ẩm thực, di chuyển.",
    sortOrder: 4,
  },
  {
    configKey: "skill_itinerary",
    configValue: `Bạn là data processor. Nhiệm vụ: lọc lịch trình mẫu.

## QUY TẮC
1. Nếu chỉ định số ngày: chỉ giữ lịch trình matching
2. Nếu chỉ định loại khách (gia đình, cặp đôi...): lọc theo target
3. Giữ nguyên chi tiết từng ngày trong lịch trình
4. Nếu nhiều lịch trình phù hợp: giữ tối đa 3

## OUTPUT
Lịch trình đã lọc, giữ format gốc với đầy đủ hoạt động.`,
    configType: "text",
    category: "skill",
    label: "Agent: Lịch trình",
    description: "Prompt cho cheap model khi lọc lịch trình mẫu.",
    sortOrder: 5,
  },
  {
    configKey: "skill_business",
    configValue: `Bạn là data processor. Nhiệm vụ: tóm tắt dữ liệu kinh doanh.

## QUY TẮC
1. Tóm tắt đối thủ: tên + kênh chính + hiệu quả
2. Tóm tắt khách hàng mục tiêu: phân khúc + motivation
3. Giữ nguyên chiến lược phòng và customer journey
4. Bỏ chi tiết không liên quan đến câu hỏi

## OUTPUT
Bản tóm tắt kinh doanh ngắn gọn, đủ thông tin.`,
    configType: "text",
    category: "skill",
    label: "Agent: Dữ liệu kinh doanh",
    description: "Prompt cho cheap model khi tóm tắt dữ liệu đối thủ, khách hàng mục tiêu, chiến lược.",
    sortOrder: 6,
  },
  {
    configKey: "skill_kb",
    configValue: `Bạn là data processor. Nhiệm vụ: tìm phần relevant trong Knowledge Base articles.

## QUY TẮC
1. Đọc tất cả articles được cung cấp
2. Chỉ giữ paragraphs/sections liên quan đến câu hỏi
3. Giữ nguyên nội dung gốc, KHÔNG diễn giải
4. Nếu không có nội dung liên quan: trả "(Không tìm thấy thông tin liên quan)"

## OUTPUT
Các đoạn trích relevant từ KB, kèm tên bài viết gốc.`,
    configType: "text",
    category: "skill",
    label: "Agent: Knowledge Base",
    description: "Prompt cho cheap model khi tìm nội dung liên quan từ KB articles.",
    sortOrder: 7,
  },

  // ─── Per-skill LLM config (model + temperature overrides) ────────────────
  // Empty = dùng cheap model mặc định. Admin có thể đổi sang model khác per skill.
  ...generateSkillModelConfigs([
    { key: "overview", label: "Tổng quan & Chi tiết", order: 11 },
    { key: "pricing", label: "Bảng giá", order: 12 },
    { key: "comparison", label: "So sánh", order: 13 },
    { key: "attractions", label: "Điểm du lịch", order: 14 },
    { key: "itinerary", label: "Lịch trình", order: 15 },
    { key: "business", label: "Dữ liệu kinh doanh", order: 16 },
    { key: "kb", label: "Knowledge Base", order: 17 },
  ]),
];

/** Generate _model and _temp config rows for each skill */
function generateSkillModelConfigs(
  skills: Array<{ key: string; label: string; order: number }>,
): AiChatConfigSeed[] {
  const configs: AiChatConfigSeed[] = [];
  for (const s of skills) {
    configs.push({
      configKey: `skill_${s.key}_model`,
      configValue: "",
      configType: "string",
      category: "skill",
      label: `${s.label} — Model`,
      description: `Model cho agent "${s.label}". Trống = dùng cheap model mặc định.`,
      sortOrder: s.order,
    });
    configs.push({
      configKey: `skill_${s.key}_temp`,
      configValue: "",
      configType: "number",
      category: "skill",
      label: `${s.label} — Temperature`,
      description: `Temperature cho agent "${s.label}". Trống = mặc định model.`,
      sortOrder: s.order + 100,
    });
  }
  return configs;
}
