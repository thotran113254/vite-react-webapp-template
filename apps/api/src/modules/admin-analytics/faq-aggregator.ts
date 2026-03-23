/**
 * FAQ keyword-based aggregator (Option A: no AI cost, fast).
 * Groups user messages by keyword category and ranks by frequency.
 */

export interface FaqEntry {
  question: string;
  count: number;
  category: string;
  examples: string[];
}

/** Category keyword map — Vietnamese travel domain */
const CATEGORIES: Array<{ label: string; keywords: RegExp }> = [
  { label: "Giá cả", keywords: /giá|bao nhiêu|chi phí|phí|tiền|cost|price|rẻ|đắt|discount|khuyến mãi/i },
  { label: "Combo & Tour", keywords: /combo|tour|gói|package|trọn gói|du lịch|lịch trình/i },
  { label: "Khách sạn", keywords: /khách sạn|hotel|phòng|resort|homestay|villa|ở đâu|lưu trú/i },
  { label: "Di chuyển", keywords: /xe|tàu|máy bay|vé|đi từ|đường|di chuyển|transport|bay|chuyến/i },
  { label: "Điểm tham quan", keywords: /tham quan|điểm|địa điểm|nơi|thăm|chơi|visit|attraction|cảnh/i },
  { label: "Ẩm thực", keywords: /ăn|nhà hàng|quán|món|đặc sản|food|restaurant|buffet|hải sản/i },
  { label: "Thời tiết & Thời gian", keywords: /thời tiết|mùa|tháng|khi nào|weather|season|thời điểm/i },
  { label: "Đặt phòng & Thanh toán", keywords: /đặt|book|đặt phòng|thanh toán|payment|deposit|cọc|hủy|cancel/i },
];

const QUESTION_INDICATORS = /\?|không|có|được không|làm sao|như thế nào|bao giờ|ở đâu|tại sao|cho tôi|tư vấn/i;

function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ").slice(0, 200);
}

function categorize(text: string): string {
  for (const cat of CATEGORIES) {
    if (cat.keywords.test(text)) return cat.label;
  }
  return "Khác";
}

function isQuestion(text: string): boolean {
  return QUESTION_INDICATORS.test(text) && text.length > 10;
}

/** Extract representative question (first sentence, max 80 chars) */
function representative(texts: string[]): string {
  const sorted = [...texts].sort((a, b) => a.length - b.length);
  const best = sorted[0] ?? texts[0] ?? "";
  return best.length > 80 ? best.slice(0, 77) + "..." : best;
}

export function aggregateFaq(rawMessages: string[]): FaqEntry[] {
  const questions = rawMessages.filter(isQuestion).map(normalize);

  // Group by category
  const groups = new Map<string, string[]>();
  for (const q of questions) {
    const cat = categorize(q);
    const existing = groups.get(cat) ?? [];
    existing.push(q);
    groups.set(cat, existing);
  }

  const entries: FaqEntry[] = [];
  for (const [category, msgs] of groups.entries()) {
    // De-duplicate very similar messages within category
    const unique = deduplicateMessages(msgs);
    entries.push({
      question: representative(unique),
      count: msgs.length,
      category,
      examples: unique.slice(0, 3),
    });
  }

  return entries.sort((a, b) => b.count - a.count).slice(0, 20);
}

/** Remove near-duplicate messages (same first 40 chars) */
function deduplicateMessages(msgs: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const m of msgs) {
    const key = m.slice(0, 40);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(m);
    }
  }
  return result;
}
