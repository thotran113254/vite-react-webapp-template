import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";
import { apiClient } from "@/lib/api-client";
import type { ItineraryTemplateItem } from "@app/shared";

interface Props {
  templateId: string;
  isAdmin: boolean;
}

type ItemForm = {
  dayNumber: string;
  timeOfDay: string;
  timeStart: string;
  timeEnd: string;
  activity: string;
  location: string;
  notes: string;
  sortOrder: string;
};

const EMPTY_FORM: ItemForm = {
  dayNumber: "1", timeOfDay: "morning", timeStart: "", timeEnd: "",
  activity: "", location: "", notes: "", sortOrder: "0",
};

const TIME_LABELS: Record<string, string> = {
  morning: "Sáng", afternoon: "Chiều", evening: "Tối",
};

function toForm(item: ItineraryTemplateItem): ItemForm {
  return {
    dayNumber: String(item.dayNumber),
    timeOfDay: item.timeOfDay,
    timeStart: item.timeStart ?? "",
    timeEnd: item.timeEnd ?? "",
    activity: item.activity,
    location: item.location ?? "",
    notes: item.notes ?? "",
    sortOrder: String(item.sortOrder),
  };
}

function toPayload(form: ItemForm) {
  return {
    dayNumber: Number(form.dayNumber),
    timeOfDay: form.timeOfDay,
    timeStart: form.timeStart || null,
    timeEnd: form.timeEnd || null,
    activity: form.activity,
    location: form.location || null,
    notes: form.notes || null,
    sortOrder: Number(form.sortOrder),
  };
}

/** Itinerary items editor grouped by day with full CRUD. */
export function ItineraryItemsEditor({ templateId, isAdmin }: Props) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ItineraryTemplateItem | null>(null);
  const [form, setForm] = useState<ItemForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ItineraryTemplateItem | null>(null);
  const f = (key: keyof ItemForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  const qk = ["itinerary-items", templateId];
  const { data, isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => {
      const res = await apiClient.get<{ data: ItineraryTemplateItem[] }>(`/itineraries/${templateId}/items`);
      return (res.data.data ?? []).sort((a, b) => a.dayNumber - b.dayNumber || a.sortOrder - b.sortOrder);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = toPayload(form);
      if (editItem) {
        await apiClient.patch(`/itineraries/${templateId}/items/${editItem.id}`, payload);
      } else {
        await apiClient.post(`/itineraries/${templateId}/items`, payload);
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qk }); setDialogOpen(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/itineraries/${templateId}/items/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qk }); setDeleteTarget(null); },
  });

  const openAdd = (day?: number) => {
    setEditItem(null);
    setForm({ ...EMPTY_FORM, dayNumber: String(day ?? 1) });
    setDialogOpen(true);
  };
  const openEdit = (item: ItineraryTemplateItem) => {
    setEditItem(item);
    setForm(toForm(item));
    setDialogOpen(true);
  };

  const items = data ?? [];
  const grouped = new Map<number, ItineraryTemplateItem[]>();
  for (const item of items) {
    const arr = grouped.get(item.dayNumber) ?? [];
    arr.push(item);
    grouped.set(item.dayNumber, arr);
  }
  const days = Array.from(grouped.keys()).sort((a, b) => a - b);

  if (isLoading) return <div className="flex justify-center py-4"><Spinner size="sm" /></div>;

  return (
    <div className="mt-3 space-y-4">
      {days.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">Chưa có hoạt động nào</p>}

      {days.map((day) => (
        <div key={day} className="rounded-lg border border-[var(--border)] bg-[var(--card)]/50">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
            <h4 className="text-sm font-semibold text-blue-700">NGÀY {day}</h4>
            {isAdmin && (
              <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-600" onClick={() => openAdd(day)}>
                <Plus className="mr-1 h-3 w-3" /> Thêm
              </Button>
            )}
          </div>
          <div className="divide-y divide-[var(--border)]">
            {(grouped.get(day) ?? []).map((item) => (
              <div key={item.id} className="flex items-start gap-3 px-4 py-2.5 group">
                <div className="shrink-0 w-20 pt-0.5">
                  {item.timeStart ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-blue-700">
                      <Clock className="h-3 w-3" />
                      {item.timeStart}{item.timeEnd ? `–${item.timeEnd}` : ""}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-[var(--muted-foreground)]">
                      {TIME_LABELS[item.timeOfDay] ?? item.timeOfDay}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--foreground)]">{item.activity}</p>
                  {item.location && <p className="text-xs text-[var(--muted-foreground)] mt-0.5">📍 {item.location}</p>}
                  {item.notes && <p className="text-xs text-[var(--muted-foreground)] mt-0.5 italic">{item.notes}</p>}
                </div>
                {isAdmin && (
                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEdit(item)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400 hover:text-red-600"
                      onClick={() => setDeleteTarget(item)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {isAdmin && (
        <Button size="sm" variant="outline" className="text-blue-600 border-blue-300" onClick={() => openAdd()}>
          <Plus className="mr-1 h-3 w-3" /> Thêm hoạt động
        </Button>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Chỉnh sửa hoạt động" : "Thêm hoạt động"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Ngày *</label>
                <Input type="number" min={1} value={form.dayNumber} onChange={f("dayNumber")} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Buổi *</label>
                <select className="flex h-9 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-1 text-sm"
                  value={form.timeOfDay} onChange={f("timeOfDay")}>
                  <option value="morning">Sáng</option>
                  <option value="afternoon">Chiều</option>
                  <option value="evening">Tối</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Thứ tự</label>
                <Input type="number" min={0} value={form.sortOrder} onChange={f("sortOrder")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Giờ bắt đầu</label>
                <Input type="time" value={form.timeStart} onChange={f("timeStart")} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Giờ kết thúc</label>
                <Input type="time" value={form.timeEnd} onChange={f("timeEnd")} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Hoạt động *</label>
              <Input value={form.activity} onChange={f("activity")} placeholder="VD: Di chuyển ga HN → ga HP" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Địa điểm</label>
              <Input value={form.location} onChange={f("location")} placeholder="VD: Ga Hà Nội" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Ghi chú</label>
              <Textarea rows={2} value={form.notes} onChange={f("notes")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" disabled={saveMutation.isPending || !form.activity}
              onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Xóa hoạt động"
        description={`Xóa "${deleteTarget?.activity}" khỏi lịch trình?`}
        confirmLabel="Xóa"
        variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
