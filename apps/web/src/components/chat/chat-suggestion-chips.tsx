import { cn } from "@/lib/utils";

/** Grouped by sale workflow — randomly picks one per group for variety */
const SUGGESTION_GROUPS = [
  // Báo giá nhanh — sale hỏi thường xuyên nhất
  [
    "Khách hỏi giá Đà Nẵng cuối tuần 2 người",
    "Báo giá Phú Quốc 3N2Đ cho cặp đôi",
    "Giá phòng gia đình Nha Trang thứ 7?",
    "Khách budget 2 triệu/đêm, có phòng nào ở Sa Pa?",
    "Bảng giá tất cả phòng Phú Quý thứ 7",
  ],
  // So sánh & tư vấn — giúp sale chốt deal
  [
    "Khách phân vân Đà Nẵng hay Nha Trang, tư vấn giúp",
    "So giá resort Phú Quốc vs Đà Nẵng cho 2 người",
    "Khách muốn đi biển rẻ nhất, gợi ý thị trường nào?",
    "Phòng nào view biển đẹp nhất tầm 3 triệu?",
  ],
  // Thông tin bổ sung — sale cần khi tư vấn khách
  [
    "Khách hỏi Đà Nẵng có gì chơi, soạn tin nhắn giúp",
    "Cách di chuyển HN đi Cát Bà chi tiết?",
    "Gợi ý lịch trình Sa Pa 3 ngày cho gia đình",
    "Khách hỏi chính sách trẻ em, phụ thu thêm người",
    "Mùa nào đi Phú Quốc đẹp nhất?",
  ],
];

function pickSuggestions(): string[] {
  return SUGGESTION_GROUPS.map((group) =>
    group[Math.floor(Math.random() * group.length)]!,
  );
}

const SUGGESTIONS = pickSuggestions();

interface ChatSuggestionChipsProps {
  onSelect: (text: string) => void;
}

/** Row of quick-reply suggestion chips for the chat interface. */
export function ChatSuggestionChips({ onSelect }: ChatSuggestionChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {SUGGESTIONS.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          onClick={() => onSelect(suggestion)}
          className={cn(
            "rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] transition-colors",
            "hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-300 dark:hover:border-blue-700",
            "focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 dark:focus:ring-offset-[var(--background)]",
          )}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
