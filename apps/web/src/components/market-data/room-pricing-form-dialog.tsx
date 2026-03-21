import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { PricingOption } from "@app/shared";

export type RoomPricingFormState = {
  comboType: string; dayType: string; seasonName: string;
  standardGuests: string;
  price: string; pricePlus1: string; priceMinus1: string; extraNight: string;
  discountPrice: string; discountPricePlus1: string; discountPriceMinus1: string;
  underStandardPrice: string; extraAdultSurcharge: string;
  extraChildSurcharge: string; includedAmenities: string;
};

export const EMPTY_ROOM_PRICING: RoomPricingFormState = {
  comboType: "", dayType: "", seasonName: "default",
  standardGuests: "2",
  price: "", pricePlus1: "", priceMinus1: "", extraNight: "",
  discountPrice: "", discountPricePlus1: "", discountPriceMinus1: "",
  underStandardPrice: "", extraAdultSurcharge: "",
  extraChildSurcharge: "", includedAmenities: "",
};

const selectCls = "flex h-9 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-1 text-sm";

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
  comboOptions: PricingOption[];
  dayOptions: PricingOption[];
  seasonOptions?: PricingOption[];
}

export function RoomPricingFormDialog({
  open, onClose, form, setForm, isEditing, isAdmin, isSaving, onSave, saveError, comboOptions, dayOptions, seasonOptions,
}: RoomPricingFormDialogProps) {
  /** Helper: currency field with label */
  const cf = (label: string, key: keyof RoomPricingFormState, cls?: string) => (
    <div className={`flex flex-col gap-1 ${cls ?? ""}`}>
      <label className={`text-sm font-medium ${cls?.includes("orange") ? "text-orange-600" : ""}`}>{label}</label>
      <CurrencyInput value={form[key]} onChange={(v) => setForm((f) => ({ ...f, [key]: v }))} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEditing ? "Sửa giá" : "Thêm giá"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {/* Selectors row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Combo *</label>
              <select className={selectCls} value={form.comboType} onChange={(e) => setForm((f) => ({ ...f, comboType: e.target.value }))}>
                {comboOptions.map((o) => <option key={o.optionKey} value={o.optionKey}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Loại ngày *</label>
              <select className={selectCls} value={form.dayType} onChange={(e) => setForm((f) => ({ ...f, dayType: e.target.value }))}>
                {dayOptions.map((o) => <option key={o.optionKey} value={o.optionKey}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Season selector */}
          {seasonOptions && seasonOptions.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Mùa giá</label>
              <select className={selectCls} value={form.seasonName} onChange={(e) => setForm((f) => ({ ...f, seasonName: e.target.value }))}>
                <option value="default">Mặc định (quanh năm)</option>
                {seasonOptions.map((o) => {
                  const cfg = o.config as { startDate?: string; endDate?: string } | undefined;
                  const range = cfg?.startDate && cfg?.endDate ? ` (${cfg.startDate} → ${cfg.endDate})` : "";
                  return <option key={o.optionKey} value={o.optionKey}>{o.label}{range}</option>;
                })}
              </select>
              <p className="text-[10px] text-[var(--muted-foreground)]">"Mặc định" = giá quanh năm</p>
            </div>
          )}

          {/* Core pricing */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Số người TC *</label>
              <Input type="number" value={form.standardGuests} onChange={(e) => setForm((f) => ({ ...f, standardGuests: e.target.value }))} />
            </div>
            {cf("Giá niêm yết *", "price")}
          </div>

          {/* Guest count variants */}
          <p className="text-xs font-medium text-[var(--muted-foreground)] pt-1">Biến thể theo số người</p>
          <div className="grid grid-cols-2 gap-3">
            {cf("+1 người", "pricePlus1")}
            {cf("-1 người", "priceMinus1")}
          </div>

          {/* Surcharges */}
          <p className="text-xs font-medium text-[var(--muted-foreground)] pt-1">Phụ thu & thêm đêm</p>
          <div className="grid grid-cols-2 gap-3">
            {cf("Thêm đêm", "extraNight")}
            {cf("Dưới TC (giá)", "underStandardPrice")}
            {cf("Phụ thu NL thêm", "extraAdultSurcharge")}
            {cf("Phụ thu trẻ em", "extraChildSurcharge")}
          </div>

          {/* Amenities */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Tiện ích bao gồm</label>
            <textarea
              className="flex min-h-[50px] w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              value={form.includedAmenities}
              onChange={(e) => setForm((f) => ({ ...f, includedAmenities: e.target.value }))}
              placeholder="VD: Bữa sáng, hồ bơi, đưa đón sân bay..."
            />
          </div>

          {/* Admin discount section */}
          {isAdmin && (
            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-orange-600 mb-2">Giá chiết khấu (Admin)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-orange-600">Giá CK</label>
                  <CurrencyInput value={form.discountPrice} onChange={(v) => setForm((f) => ({ ...f, discountPrice: v }))} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-orange-600">CK +1 người</label>
                  <CurrencyInput value={form.discountPricePlus1} onChange={(v) => setForm((f) => ({ ...f, discountPricePlus1: v }))} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-orange-600">CK -1 người</label>
                  <CurrencyInput value={form.discountPriceMinus1} onChange={(v) => setForm((f) => ({ ...f, discountPriceMinus1: v }))} />
                </div>
              </div>
            </div>
          )}
        </div>

        {saveError && (
          <div className="flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{saveError}</span>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button className="bg-teal-600 hover:bg-teal-700" disabled={isSaving || !form.price} onClick={onSave}>
            {isSaving ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
