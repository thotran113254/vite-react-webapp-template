import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ImageManager } from "@/components/market-data/image-manager";

export type TransportProviderFormState = {
  providerName: string;
  providerCode: string;
  transportCategory: string;
  routeName: string;
  pickupPointsText: string;
  contactPhone: string;
  contactZalo: string;
  notes: string;
  images: string[];
  pricingNotes: string;
};

export const EMPTY_PROVIDER_FORM: TransportProviderFormState = {
  providerName: "",
  providerCode: "",
  transportCategory: "bus",
  routeName: "",
  pickupPointsText: "",
  contactPhone: "",
  contactZalo: "",
  notes: "",
  images: [],
  pricingNotes: "",
};

const CATEGORIES = [
  { value: "bus", label: "Xe khách" },
  { value: "ferry", label: "Tàu/phà" },
];

const selectCls = "flex h-9 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-1 text-sm";

interface TransportProviderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: TransportProviderFormState;
  setForm: React.Dispatch<React.SetStateAction<TransportProviderFormState>>;
  isEditing: boolean;
  isSaving: boolean;
  onSave: () => void;
}

export function TransportProviderFormDialog({
  open, onOpenChange, form, setForm, isEditing, isSaving, onSave,
}: TransportProviderFormDialogProps) {
  const sf = (key: keyof TransportProviderFormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((s) => ({ ...s, [key]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Chỉnh sửa nhà xe/tàu" : "Thêm nhà xe/tàu mới"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 grid-cols-2">
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-sm font-medium">Tên nhà xe/tàu *</label>
            <Input value={form.providerName} onChange={sf("providerName")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Mã nhà xe</label>
            <Input value={form.providerCode} onChange={sf("providerCode")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Loại phương tiện *</label>
            <select
              className={selectCls}
              value={form.transportCategory}
              onChange={(e) => setForm((s) => ({ ...s, transportCategory: e.target.value }))}
            >
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-sm font-medium">Tuyến đường *</label>
            <Input value={form.routeName} onChange={sf("routeName")} />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-sm font-medium">Điểm đón (mỗi dòng: giờ + tên điểm)</label>
            <textarea
              className="flex min-h-[60px] w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              value={form.pickupPointsText}
              onChange={(e) => setForm((s) => ({ ...s, pickupPointsText: e.target.value }))}
              placeholder={"6h00 Bến xe Mỹ Đình\n7h00 Bến xe Giáp Bát\n8h00 Gia Lâm"}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">SĐT liên hệ</label>
            <Input value={form.contactPhone} onChange={sf("contactPhone")} placeholder="0901234567" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Zalo</label>
            <Input value={form.contactZalo} onChange={sf("contactZalo")} placeholder="0901234567" />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-sm font-medium">Ghi chú giá (chiết khấu, niêm yết, phụ thu TE)</label>
            <textarea
              className="flex min-h-[60px] w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              value={form.pricingNotes}
              onChange={(e) => setForm((s) => ({ ...s, pricingNotes: e.target.value }))}
              placeholder="VD: Chiết khấu 10% cho đoàn >10 người..."
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-sm font-medium">Ghi chú</label>
            <textarea
              className="flex min-h-[40px] w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              value={form.notes}
              onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-sm font-medium">Hình ảnh</label>
            <ImageManager images={form.images} onChange={(imgs) => setForm((s) => ({ ...s, images: imgs }))} maxImages={6} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isSaving || !form.providerName || !form.routeName}
            onClick={onSave}
          >
            {isSaving ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
