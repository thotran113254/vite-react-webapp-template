import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";
import { apiClient } from "@/lib/api-client";
import type { PricingOption } from "@app/shared";

type OptionForm = {
  category: string; optionKey: string; label: string;
  description: string; sortOrder: string; isActive: boolean;
};
const EMPTY_FORM: OptionForm = {
  category: "combo_type", optionKey: "", label: "",
  description: "", sortOrder: "0", isActive: true,
};

const CATEGORY_LABELS: Record<string, string> = {
  combo_type: "Loại Combo",
  day_type: "Loại Ngày",
};

/** Admin UI to manage pricing option types (combo types, day types). */
export function PricingOptionsManager() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [editItem, setEditItem] = useState<PricingOption | null>(null);
  const [form, setForm] = useState<OptionForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<PricingOption | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("combo_type");

  const qk = ["pricing-options"];
  const { data, isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => {
      const res = await apiClient.get<{ data: PricingOption[] }>("/pricing-options");
      return res.data.data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        category: form.category,
        optionKey: form.optionKey,
        label: form.label,
        description: form.description || null,
        sortOrder: Number(form.sortOrder),
        isActive: form.isActive,
      };
      if (editItem) {
        await apiClient.patch(`/pricing-options/${editItem.id}`, payload);
      } else {
        await apiClient.post("/pricing-options", payload);
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qk }); closeDialog(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/pricing-options/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qk }); setDeleteTarget(null); },
  });

  const openAdd = () => {
    setEditItem(null);
    setForm({ ...EMPTY_FORM, category: activeCategory });
    setDialog(true);
  };

  const openEdit = (item: PricingOption) => {
    setEditItem(item);
    setForm({
      category: item.category,
      optionKey: item.optionKey,
      label: item.label,
      description: item.description ?? "",
      sortOrder: String(item.sortOrder),
      isActive: item.isActive,
    });
    setDialog(true);
  };

  const closeDialog = () => { setDialog(false); setEditItem(null); setForm(EMPTY_FORM); };

  const items = (data ?? []).filter((o) => o.category === activeCategory);

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Settings2 className="h-5 w-5 text-teal-600" />
        <h2 className="text-lg font-semibold">Cấu hình Combo & Loại ngày</h2>
      </div>

      <p className="text-sm text-[var(--muted-foreground)]">
        Quản lý các loại combo (3N2Đ, 2N1Đ...) và loại ngày (T2-T5, T6, T7...) cho bảng giá phòng. AI Agent sẽ đọc mô tả để hiểu và tư vấn chính xác.
      </p>

      {/* Category tabs */}
      <div className="flex gap-2 border-b border-[var(--border)] pb-0">
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeCategory === key
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Items list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[var(--muted-foreground)]">{items.length} mục</p>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 h-7 text-xs" onClick={openAdd}>
            <Plus className="mr-1 h-3 w-3" /> Thêm
          </Button>
        </div>

        {items.length === 0 && <p className="text-sm text-[var(--muted-foreground)] py-4 text-center">Chưa có mục nào</p>}

        <div className="space-y-2">
          {items.sort((a, b) => a.sortOrder - b.sortOrder).map((item) => (
            <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border border-[var(--border)] group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-[var(--muted)]/50 px-1.5 py-0.5 rounded">{item.optionKey}</span>
                  <span className="font-semibold text-sm">{item.label}</span>
                  {!item.isActive && <Badge variant="secondary">Ẩn</Badge>}
                  <span className="text-xs text-[var(--muted-foreground)]">#{item.sortOrder}</span>
                </div>
                {item.description && (
                  <p className="text-xs text-[var(--muted-foreground)] mt-1 line-clamp-2">{item.description}</p>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(item)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => setDeleteTarget(item)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={dialog} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? "Sửa" : "Thêm"} {CATEGORY_LABELS[form.category] ?? form.category}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Mã (key) *</label>
                <Input value={form.optionKey} onChange={(e) => setForm((f) => ({ ...f, optionKey: e.target.value }))}
                  placeholder="VD: 4n3d" disabled={!!editItem} />
                <p className="text-[10px] text-[var(--muted-foreground)]">Không thay đổi sau khi tạo</p>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Nhãn hiển thị *</label>
                <Input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="VD: 4N3Đ" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Mô tả (AI đọc để hiểu)</label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="VD: Combo 4 ngày 3 đêm — gói dài ngày cho khách nghỉ dưỡng" />
              <p className="text-[10px] text-[var(--muted-foreground)]">AI Agent sẽ đọc mô tả này để hiểu và mapping chính xác khi tư vấn khách</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Thứ tự</label>
                <Input type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="isActive" checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-[var(--border)]" />
                <label htmlFor="isActive" className="text-sm font-medium">Kích hoạt</label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Hủy</Button>
            <Button className="bg-teal-600 hover:bg-teal-700" disabled={saveMutation.isPending || !form.optionKey || !form.label}
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
        title="Xóa cấu hình"
        description={`Xóa "${deleteTarget?.label}" (${deleteTarget?.optionKey})? Các bảng giá đang dùng key này sẽ không bị ảnh hưởng.`}
        confirmLabel="Xóa"
        variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
