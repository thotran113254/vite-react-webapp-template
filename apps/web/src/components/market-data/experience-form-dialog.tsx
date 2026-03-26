import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ImageManager } from "@/components/market-data/image-manager";
import { apiClient } from "@/lib/api-client";
import type { MarketExperience } from "@app/shared";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  marketId: string;
  editItem: MarketExperience | null;
  onSuccess: () => void;
}

type FormState = {
  activityName: string;
  cost: string;
  description: string;
  notes: string;
  images: string[];
};

const EMPTY: FormState = { activityName: "", cost: "", description: "", notes: "", images: [] };

/** Form dialog for creating/editing an experience activity with image support. */
export function ExperienceFormDialog({ open, onOpenChange, marketId, editItem, onSuccess }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);

  useEffect(() => {
    if (editItem) {
      setForm({
        activityName: editItem.activityName,
        cost: editItem.cost ?? "",
        description: editItem.description ?? "",
        notes: editItem.notes ?? "",
        images: (editItem.images as string[]) ?? [],
      });
    } else {
      setForm(EMPTY);
    }
  }, [editItem, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        activityName: form.activityName,
        cost: form.cost || null,
        description: form.description || null,
        notes: form.notes || null,
        images: form.images,
      };
      if (editItem) {
        await apiClient.patch(`/markets/${marketId}/experiences/${editItem.id}`, payload);
      } else {
        await apiClient.post(`/markets/${marketId}/experiences`, payload);
      }
    },
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
    },
  });

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((s) => ({ ...s, [key]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editItem ? "Chỉnh sửa trải nghiệm" : "Thêm trải nghiệm mới"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Tên hoạt động *</label>
            <Input value={form.activityName} onChange={set("activityName")} placeholder="VD: Lặn biển, Leo núi..." />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Chi phí</label>
            <Input value={form.cost} onChange={set("cost")} placeholder="VD: 500,000 VND/người, Miễn phí..." />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Mô tả</label>
            <Textarea rows={3} value={form.description} onChange={set("description")} placeholder="Mô tả hoạt động..." />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Ghi chú</label>
            <Textarea rows={2} value={form.notes} onChange={set("notes")} placeholder="Lưu ý, kinh nghiệm..." />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Hình ảnh</label>
            <ImageManager
              images={form.images}
              onChange={(imgs) => setForm((s) => ({ ...s, images: imgs }))}
              maxImages={8}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            disabled={saveMutation.isPending || !form.activityName.trim()}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
