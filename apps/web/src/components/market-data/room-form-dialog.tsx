import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export type RoomForm = {
  roomType: string; bookingCode: string; capacity: string;
  description: string; sortOrder: string;
};

export const EMPTY_ROOM: RoomForm = {
  roomType: "", bookingCode: "", capacity: "2", description: "", sortOrder: "0",
};

interface RoomFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: RoomForm;
  setForm: React.Dispatch<React.SetStateAction<RoomForm>>;
  isEditing: boolean;
  isSaving: boolean;
  onSave: () => void;
}

/** Reusable dialog for creating/editing a room. */
export function RoomFormDialog({
  open, onOpenChange, form, setForm, isEditing, isSaving, onSave,
}: RoomFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEditing ? "Sửa phòng" : "Thêm phòng"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Loại phòng *</label>
            <Input value={form.roomType} onChange={(e) => setForm((f) => ({ ...f, roomType: e.target.value }))}
              placeholder="VD: Phòng Đôi View Biển" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Mã đặt phòng</label>
              <Input value={form.bookingCode} onChange={(e) => setForm((f) => ({ ...f, bookingCode: e.target.value }))}
                placeholder="SR01" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Sức chứa</label>
              <Input type="number" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Thứ tự</label>
              <Input type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Mô tả</label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button className="bg-teal-600 hover:bg-teal-700" disabled={isSaving || !form.roomType} onClick={onSave}>
            {isSaving ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
