import { Plus, X, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import type { PricingOption } from "@app/shared";

export interface PricingPeriod {
  seasonName: string;
  seasonStart: string; // YYYY-MM-DD
  seasonEnd: string;
  dayPrices: Record<string, { price: string; discountPrice: string }>;
}

interface PeriodEditorProps {
  periods: PricingPeriod[];
  onChange: (periods: PricingPeriod[]) => void;
  dayOptions: PricingOption[];
  isAdmin: boolean;
}

function newPeriod(dayOptions: PricingOption[]): PricingPeriod {
  const dayPrices: PricingPeriod["dayPrices"] = {};
  for (const d of dayOptions) dayPrices[d.optionKey] = { price: "", discountPrice: "" };
  return { seasonName: "", seasonStart: "", seasonEnd: "", dayPrices };
}

export function RoomPricingPeriodEditor({ periods, onChange, dayOptions, isAdmin }: PeriodEditorProps) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const updatePeriod = (i: number, partial: Partial<PricingPeriod>) => {
    onChange(periods.map((p, idx) => idx === i ? { ...p, ...partial } : p));
  };

  const updateDayPrice = (
    periodIdx: number,
    dayKey: string,
    field: "price" | "discountPrice",
    value: string,
  ) => {
    const period = periods[periodIdx]!;
    const existing = period.dayPrices[dayKey] ?? { price: "", discountPrice: "" };
    const dayPrices: PricingPeriod["dayPrices"] = {
      ...period.dayPrices,
      [dayKey]: { ...existing, [field]: value },
    };
    updatePeriod(periodIdx, { dayPrices });
  };

  const addPeriod = () => {
    const next = [...periods, newPeriod(dayOptions)];
    onChange(next);
    // Expand the newly added period
    setCollapsed((prev) => {
      const s = new Set(prev);
      s.delete(next.length - 1);
      return s;
    });
  };

  const removePeriod = (i: number) => {
    onChange(periods.filter((_, idx) => idx !== i));
    setCollapsed((prev) => {
      const s = new Set<number>();
      for (const v of prev) { if (v < i) s.add(v); else if (v > i) s.add(v - 1); }
      return s;
    });
  };

  const toggleCollapse = (i: number) => {
    setCollapsed((prev) => {
      const s = new Set(prev);
      if (s.has(i)) s.delete(i); else s.add(i);
      return s;
    });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
        Cài đặt giá theo giai đoạn
      </p>

      {periods.map((period, i) => {
        const isCollapsed = collapsed.has(i);
        const label = period.seasonName || `Giai đoạn ${i + 1}`;
        const dateRange = period.seasonStart && period.seasonEnd
          ? ` (${period.seasonStart} → ${period.seasonEnd})`
          : "";
        return (
          <div key={i} className="border border-[var(--border)] rounded-lg overflow-hidden">
            {/* Period header */}
            <div
              className="flex items-center gap-2 px-3 py-2 bg-[var(--muted)]/30 cursor-pointer"
              onClick={() => toggleCollapse(i)}
            >
              {isCollapsed
                ? <ChevronRight className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                : <ChevronDown className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
              }
              <span className="text-sm font-medium flex-1">{label}{dateRange}</span>
              {isAdmin && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removePeriod(i); }}
                  className="text-[var(--muted-foreground)] hover:text-red-600 ml-auto"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Period body */}
            {!isCollapsed && (
              <div className="px-3 py-2 space-y-2">
                {/* Name + date range */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-[var(--muted-foreground)]">Tên giai đoạn</label>
                    <Input
                      value={period.seasonName}
                      placeholder="VD: Hè 2025"
                      onChange={(e) => updatePeriod(i, { seasonName: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-[var(--muted-foreground)]">Từ ngày</label>
                    <input
                      type="date"
                      value={period.seasonStart}
                      onChange={(e) => updatePeriod(i, { seasonStart: e.target.value })}
                      className="flex h-8 w-full rounded-md border border-[var(--border)] bg-transparent px-3 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-[var(--muted-foreground)]">Đến ngày</label>
                    <input
                      type="date"
                      value={period.seasonEnd}
                      onChange={(e) => updatePeriod(i, { seasonEnd: e.target.value })}
                      className="flex h-8 w-full rounded-md border border-[var(--border)] bg-transparent px-3 text-sm"
                    />
                  </div>
                </div>

                {/* Day prices */}
                <div className="space-y-1.5">
                  {dayOptions.map((day) => {
                    const dp = period.dayPrices[day.optionKey] ?? { price: "", discountPrice: "" };
                    return (
                      <div key={day.optionKey} className="grid grid-cols-[110px_1fr_1fr] gap-2 items-center">
                        <span className="text-xs text-[var(--muted-foreground)]">{day.label}</span>
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[10px] text-[var(--muted-foreground)]">Niêm yết</label>
                          <CurrencyInput
                            value={dp.price}
                            onChange={(v) => updateDayPrice(i, day.optionKey, "price", v)}
                          />
                        </div>
                        {isAdmin && (
                          <div className="flex flex-col gap-0.5">
                            <label className="text-[10px] text-orange-500">Chiết khấu</label>
                            <CurrencyInput
                              value={dp.discountPrice}
                              onChange={(v) => updateDayPrice(i, day.optionKey, "discountPrice", v)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <Button type="button" variant="ghost" size="sm" className="text-xs text-blue-600 h-7" onClick={addPeriod}>
        <Plus className="mr-1 h-3 w-3" /> Thêm giai đoạn giá mới
      </Button>
    </div>
  );
}
