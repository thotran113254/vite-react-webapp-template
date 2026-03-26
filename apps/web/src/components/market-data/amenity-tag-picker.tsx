import { useState } from "react";
import { X } from "lucide-react";

const PREDEFINED = [
  "Bãi biển", "Wifi miễn phí", "Hồ bơi", "Phòng họp",
  "Nhà hàng", "Spa", "Gym", "Điều hòa", "Bếp", "Sân vườn",
  "Bữa sáng", "Đưa đón sân bay", "Chỗ đỗ xe", "Phòng xông hơi",
];

interface AmenityTagPickerProps {
  selected: string[];
  onChange: (amenities: string[]) => void;
}

/** Checkbox-style tag picker for property amenities with custom input. */
export function AmenityTagPicker({ selected, onChange }: AmenityTagPickerProps) {
  const [customText, setCustomText] = useState("");

  const toggle = (tag: string) => {
    onChange(selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag]);
  };

  const addCustom = () => {
    const trimmed = customText.trim();
    if (trimmed && !selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
    }
    setCustomText("");
  };

  const customTags = selected.filter((t) => !PREDEFINED.includes(t));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PREDEFINED.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              selected.includes(tag)
                ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-300"
                : "bg-transparent border-[var(--border)] text-[var(--muted-foreground)] hover:border-blue-300"
            }`}
          >
            {selected.includes(tag) ? "✓ " : ""}{tag}
          </button>
        ))}
        {customTags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-blue-100 border border-blue-300 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-300">
            {tag}
            <button type="button" onClick={() => toggle(tag)} className="hover:text-red-500"><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
          placeholder="Thêm tiện ích khác..."
          className="flex h-8 flex-1 rounded-md border border-[var(--border)] bg-transparent px-3 text-xs"
        />
      </div>
    </div>
  );
}
