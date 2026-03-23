import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RoomPricingPeriodEditor, type PricingPeriod } from "./room-pricing-period-editor";
import { SurchargeRulesEditor, type SurchargeRule } from "./surcharge-rules-editor";
import type { PricingOption, RoomPricing } from "@app/shared";

export interface RoomPricingFormState {
  periods: PricingPeriod[];
  standardGuests: string;
  includedAmenities: string;
  extraAdultSurcharge: string;
  surchargeRules: SurchargeRule[];
  notes: string;
}

export function buildEmptyFormState(dayOptions: PricingOption[]): RoomPricingFormState {
  const dayPrices: PricingPeriod["dayPrices"] = {};
  for (const d of dayOptions) dayPrices[d.optionKey] = { price: "", discountPrice: "" };
  return {
    periods: [{ seasonName: "default", seasonStart: "", seasonEnd: "", dayPrices }],
    standardGuests: "2",
    includedAmenities: "",
    extraAdultSurcharge: "",
    surchargeRules: [],
    notes: "",
  };
}

/** Group flat RoomPricing records into PricingPeriod array. */
export function recordsToPeriods(records: RoomPricing[], dayOptions: PricingOption[]): PricingPeriod[] {
  const periodMap = new Map<string, PricingPeriod>();
  for (const r of records) {
    const key = `${r.seasonName}|${r.seasonStart ?? ""}`;
    if (!periodMap.has(key)) {
      const dayPrices: PricingPeriod["dayPrices"] = {};
      for (const d of dayOptions) dayPrices[d.optionKey] = { price: "", discountPrice: "" };
      periodMap.set(key, {
        seasonName: r.seasonName,
        seasonStart: r.seasonStart ?? "",
        seasonEnd: r.seasonEnd ?? "",
        dayPrices,
      });
    }
    const period = periodMap.get(key)!;
    period.dayPrices[r.dayType] = {
      price: r.price ? String(r.price) : "",
      discountPrice: r.discountPrice ? String(r.discountPrice) : "",
    };
  }
  return periodMap.size > 0
    ? Array.from(periodMap.values())
    : [{ seasonName: "default", seasonStart: "", seasonEnd: "", dayPrices: Object.fromEntries(dayOptions.map((d) => [d.optionKey, { price: "", discountPrice: "" }])) }];
}

interface RoomPricingFormDialogProps {
  open: boolean;
  onClose: () => void;
  form: RoomPricingFormState;
  setForm: React.Dispatch<React.SetStateAction<RoomPricingFormState>>;
  isEditing: boolean;
  isAdmin: boolean;
  isSaving: boolean;
  onSave: () => void;
  saveError: string | null;
  dayOptions: PricingOption[];
}

export function RoomPricingFormDialog({
  open, onClose, form, setForm, isEditing, isAdmin, isSaving, onSave, saveError, dayOptions,
}: RoomPricingFormDialogProps) {
  const hasAnyPrice = form.periods.some((p) =>
    Object.values(p.dayPrices).some((dp) => dp.price !== "")
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Sửa bảng giá" : "Thêm bảng giá"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Section 1: Periods */}
          <RoomPricingPeriodEditor
            periods={form.periods}
            onChange={(periods) => setForm((f) => ({ ...f, periods }))}
            dayOptions={dayOptions}
            isAdmin={isAdmin}
          />

          {/* Section 2: Room settings */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Cài đặt phòng</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Số người tiêu chuẩn</label>
                <Input
                  type="number"
                  value={form.standardGuests}
                  onChange={(e) => setForm((f) => ({ ...f, standardGuests: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Tiện ích bao gồm</label>
                <Input
                  value={form.includedAmenities}
                  placeholder="VD: Bữa sáng, hồ bơi..."
                  onChange={(e) => setForm((f) => ({ ...f, includedAmenities: e.target.value }))}
                  className="h-9"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Ghi chú</label>
              <textarea
                className="flex min-h-[48px] w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Ghi chú thêm..."
              />
            </div>
          </div>

          {/* Section 3: Surcharges */}
          <div className="border-t pt-4">
            <SurchargeRulesEditor
              rules={form.surchargeRules}
              onChange={(surchargeRules) => setForm((f) => ({ ...f, surchargeRules }))}
              adultSurcharge={form.extraAdultSurcharge}
              onAdultSurchargeChange={(v) => setForm((f) => ({ ...f, extraAdultSurcharge: v }))}
            />
          </div>
        </div>

        {saveError && (
          <div className="flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400 mt-3">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{saveError}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button
            className="bg-teal-600 hover:bg-teal-700"
            disabled={isSaving || !hasAnyPrice}
            onClick={onSave}
          >
            {isSaving ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
