/**
 * Date info handler for AI tool — resolves dates to day-of-week and dayType.
 * Includes Vietnamese holiday detection.
 */

// Vietnamese fixed holidays (MM-DD format)
const FIXED_HOLIDAYS: Record<string, string> = {
  "01-01": "Tết Dương lịch",
  "04-30": "Ngày Giải phóng miền Nam",
  "05-01": "Ngày Quốc tế Lao động",
  "09-02": "Ngày Quốc khánh",
  "09-03": "Ngày Quốc khánh (nghỉ bù)",
};

// Approximate lunar holiday periods (solar dates, varies ±2 days by year)
// Admin should configure exact dates per year via pricing configs
const LUNAR_HOLIDAY_NOTES = [
  "Tết Nguyên Đán (Âm lịch 29/12 - 5/1): thường rơi vào cuối tháng 1 đến giữa tháng 2 Dương lịch",
  "Giỗ Tổ Hùng Vương (10/3 Âm lịch): thường rơi vào tháng 4 Dương lịch",
];

const DAY_NAMES_VI: Record<number, string> = {
  0: "Chủ nhật", 1: "Thứ 2", 2: "Thứ 3", 3: "Thứ 4",
  4: "Thứ 5", 5: "Thứ 6", 6: "Thứ 7",
};

const DAY_SHORT_VI: Record<number, string> = {
  0: "CN", 1: "T2", 2: "T3", 3: "T4", 4: "T5", 5: "T6", 6: "T7",
};

const DAY_TO_DAYTYPE: Record<number, string> = {
  0: "sunday", 1: "weekday", 2: "weekday", 3: "weekday",
  4: "weekday", 5: "friday", 6: "saturday",
};

const DAYTYPE_LABELS_VI: Record<string, string> = {
  weekday: "Ngày thường (T2-T5)",
  friday: "Thứ 6",
  saturday: "Thứ 7",
  sunday: "Chủ nhật",
  holiday: "Ngày lễ",
};

/** Parse date string in YYYY-MM-DD or DD/MM/YYYY format */
function parseDate(input: string): Date | null {
  const trimmed = input.trim();

  // DD/MM/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  // YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  return null;
}

interface DateInfo {
  input: string;
  date: Date;
  dayOfWeek: number;
  dayNameVi: string;
  dayShortVi: string;
  dayType: string;
  dayTypeLabel: string;
  holiday: string | null;
}

function analyzeSingleDate(input: string): DateInfo | null {
  const date = parseDate(input);
  if (!date || isNaN(date.getTime())) return null;

  const dayOfWeek = date.getDay();
  const mmdd = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const holiday = FIXED_HOLIDAYS[mmdd] ?? null;
  const dayType = holiday ? "holiday" : DAY_TO_DAYTYPE[dayOfWeek]!;

  return {
    input,
    date,
    dayOfWeek,
    dayNameVi: DAY_NAMES_VI[dayOfWeek]!,
    dayShortVi: DAY_SHORT_VI[dayOfWeek]!,
    dayType,
    dayTypeLabel: DAYTYPE_LABELS_VI[dayType] ?? dayType,
    holiday,
  };
}

/** Format date as DD/MM/YYYY */
function fmtDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/**
 * Analyze multiple dates and return formatted Vietnamese text for AI.
 * Includes dayType array ready for calculateComboPrice.
 */
export function getDateInfoFormatted(dates: string[]): string {
  if (!dates || dates.length === 0) {
    return "Lỗi: Cần ít nhất 1 ngày. Format: YYYY-MM-DD hoặc DD/MM/YYYY";
  }

  const results: DateInfo[] = [];
  const errors: string[] = [];

  for (const d of dates) {
    const info = analyzeSingleDate(d);
    if (info) {
      results.push(info);
    } else {
      errors.push(`"${d}" — không đúng format (dùng YYYY-MM-DD hoặc DD/MM/YYYY)`);
    }
  }

  if (results.length === 0) {
    return `Lỗi: Không parse được ngày nào.\n${errors.join("\n")}`;
  }

  let text = "[THÔNG TIN NGÀY]\n";

  for (const r of results) {
    text += `${fmtDate(r.date)} — ${r.dayNameVi} (${r.dayShortVi}) → dayType: "${r.dayType}" (${r.dayTypeLabel})`;
    if (r.holiday) text += ` 🎉 NGÀY LỄ: ${r.holiday}`;
    text += "\n";
  }

  // Generate dayTypes array for calculateComboPrice (for multi-night bookings)
  if (results.length > 1) {
    const dayTypes = results.map((r) => r.dayType);
    text += `\ndayTypes cho calculateComboPrice: [${dayTypes.map((d) => `"${d}"`).join(", ")}]\n`;
    text += `Số đêm: ${results.length}\n`;

    // Summary of day types
    const summary = new Map<string, number>();
    for (const dt of dayTypes) {
      summary.set(dt, (summary.get(dt) ?? 0) + 1);
    }
    const parts = [...summary.entries()].map(([dt, count]) => {
      const label = DAYTYPE_LABELS_VI[dt] ?? dt;
      return `${count} đêm ${label}`;
    });
    text += `Phân bổ: ${parts.join(", ")}\n`;
  }

  if (errors.length > 0) {
    text += `\nLỗi parse:\n${errors.join("\n")}\n`;
  }

  text += `\nLưu ý ngày lễ Âm lịch (cần xác nhận thủ công):\n`;
  for (const note of LUNAR_HOLIDAY_NOTES) {
    text += `- ${note}\n`;
  }

  return text;
}
