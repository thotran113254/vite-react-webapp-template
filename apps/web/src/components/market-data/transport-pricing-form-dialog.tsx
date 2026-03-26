import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const VEHICLE_CLASSES = ["cabin", "limousine", "sleeper", "speed_boat", "small_boat"];
export const SEAT_TYPES = ["single", "double", "front", "middle", "back", "vip", "standard", "sleeper"];

export type TransportPricingFormState = {
  vehicleClass: string;
  seatType: string;
  capacityPerUnit: string;
  onewayListedPrice: string;
  roundtripListedPrice: string;
  onewayDiscountPrice: string;
  roundtripDiscountPrice: string;
  childFreeUnder: string;
  childDiscountUnder: string;
  childDiscountAmount: string;
  onboardServices: string;
  crossProvinceSurchargesText: string;
};

export const EMPTY_PRICING_FORM: TransportPricingFormState = {
  vehicleClass: "cabin",
  seatType: "standard",
  capacityPerUnit: "1",
  onewayListedPrice: "",
  roundtripListedPrice: "",
  onewayDiscountPrice: "",
  roundtripDiscountPrice: "",
  childFreeUnder: "5",
  childDiscountUnder: "10",
  childDiscountAmount: "",
  onboardServices: "",
  crossProvinceSurchargesText: "",
};

const selectCls = "flex h-9 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-1 text-sm";

interface TransportPricingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: TransportPricingFormState;
  setForm: React.Dispatch<React.SetStateAction<TransportPricingFormState>>;
  isEditing: boolean;
  isAdmin: boolean;
  isSaving: boolean;
  onSave: () => void;
}

export function TransportPricingFormDialog({
  open, onOpenChange, form, setForm, isEditing, isAdmin, isSaving, onSave,
}: TransportPricingFormDialogProps) {
  const sf = (key: keyof TransportPricingFormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((s) => ({ ...s, [key]: e.target.value }));
  /** Currency field setter */
  const cf = (key: keyof TransportPricingFormState) => (v: string) =>
    setForm((s) => ({ ...s, [key]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Chỉnh sửa giá vé" : "Thêm giá vé mới"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Hạng xe *</label>
            <select className={selectCls} value={form.vehicleClass} onChange={(e) => setForm((s) => ({ ...s, vehicleClass: e.target.value }))}>
              {VEHICLE_CLASSES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Loại ghế *</label>
            <select className={selectCls} value={form.seatType} onChange={(e) => setForm((s) => ({ ...s, seatType: e.target.value }))}>
              {SEAT_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Sức chứa/đơn vị</label>
            <Input type="number" value={form.capacityPerUnit} onChange={sf("capacityPerUnit")} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Giá 1 chiều *</label>
            <CurrencyInput value={form.onewayListedPrice} onChange={cf("onewayListedPrice")} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Giá 2 chiều</label>
            <CurrencyInput value={form.roundtripListedPrice} onChange={cf("roundtripListedPrice")} />
          </div>
          {isAdmin && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-orange-600">CK 1 chiều</label>
                <CurrencyInput value={form.onewayDiscountPrice} onChange={cf("onewayDiscountPrice")} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-orange-600">CK 2 chiều</label>
                <CurrencyInput value={form.roundtripDiscountPrice} onChange={cf("roundtripDiscountPrice")} />
              </div>
            </>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Trẻ em miễn phí dưới (tuổi)</label>
            <Input type="number" value={form.childFreeUnder} onChange={sf("childFreeUnder")} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Trẻ em giảm giá dưới (tuổi)</label>
            <Input type="number" value={form.childDiscountUnder} onChange={sf("childDiscountUnder")} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Mức giảm giá trẻ em</label>
            <CurrencyInput value={form.childDiscountAmount} onChange={cf("childDiscountAmount")} />
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-sm font-medium">Dịch vụ trên xe</label>
            <Input value={form.onboardServices} onChange={sf("onboardServices")} placeholder="Nước lọc, đồ ăn nhẹ" />
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-sm font-medium">Phụ thu liên tỉnh (mỗi dòng: Tỉnh: Số tiền)</label>
            <textarea
              className="flex min-h-[50px] w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              value={form.crossProvinceSurchargesText}
              onChange={(e) => setForm((s) => ({ ...s, crossProvinceSurchargesText: e.target.value }))}
              placeholder={"Quảng Ninh: 200000\nNinh Bình: 300000"}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isSaving || !form.onewayListedPrice}
            onClick={onSave}
          >
            {isSaving ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
