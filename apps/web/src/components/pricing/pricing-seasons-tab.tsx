import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";
import { apiClient } from "@/lib/api-client";
import { slugify } from "@/lib/utils";
import type { PricingOption } from "@app/shared";

type SeasonForm = {
  optionKey: string; label: string; description: string;
  startDate: string; endDate: string; sortOrder: string; isActive: boolean;
};

const EMPTY: SeasonForm = {
  optionKey: "", label: "", description: "",
  startDate: "", endDate: "", sortOrder: "0", isActive: true,
};

const MM_DD_REGEX = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }));
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Parse MM-DD → { month, day } */
const parseMmDd = (mmdd: string) => {
  if (!mmdd) return { month: 0, day: 0 };
  const [mm, dd] = mmdd.split("-");
  return { month: Number(mm), day: Number(dd) };
};
/** Build MM-DD from month + day */
const buildMmDd = (month: number, day: number) =>
  month && day ? `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
/** Format MM-DD to readable: "06-01" → "1/6" */
const fmtMmDd = (mmdd: string) => {
  const { month, day } = parseMmDd(mmdd);
  return month && day ? `${day}/${month}` : "";
};

/** Check if start > end (means cross-year season, e.g., 11-01 → 02-28) */
const isCrossYear = (start: string, end: string) => {
  if (!start || !end) return false;
  const s = parseMmDd(start), e = parseMmDd(end);
  return s.month > e.month || (s.month === e.month && s.day > e.day);
};

/** Describe the season range with cross-year awareness */
const describeRange = (start: string, end: string) => {
  if (!start || !end) return "";
  const cross = isCrossYear(start, end);
  return `${fmtMmDd(start)} → ${fmtMmDd(end)}${cross ? " (qua năm sau)" : ""}`;
};

const selectCls = "flex h-9 w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-sm";

const QK = ["pricing-options"];

/** Admin UI for managing pricing seasons with date ranges. */
export function PricingSeasonsTab() {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [editItem, setEditItem] = useState<PricingOption | null>(null);
  const [form, setForm] = useState<SeasonForm>(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<PricingOption | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: allOptions, isLoading } = useQuery({
    queryKey: QK,
    queryFn: async () => {
      const res = await apiClient.get<{ data: PricingOption[] }>("/pricing-options");
      return res.data.data ?? [];
    },
  });
  const data = (allOptions ?? []).filter((o) => o.category === "season");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        category: "season",
        optionKey: form.optionKey,
        label: form.label,
        description: form.description || null,
        sortOrder: Number(form.sortOrder),
        isActive: form.isActive,
        config: { startDate: form.startDate, endDate: form.endDate },
      };
      if (editItem) await apiClient.patch(`/pricing-options/${editItem.id}`, payload);
      else await apiClient.post("/pricing-options", payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK }); closeDialog(); },
    onError: (err: any) => {
      setSaveError(err?.response?.data?.message ?? err?.message ?? "Lỗi lưu mùa giá");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/pricing-options/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK }); setDeleteTarget(null); },
    onError: (err: any) => { setSaveError(err?.response?.data?.message ?? "Lỗi xóa mùa giá"); },
  });

  const openAdd = () => { setEditItem(null); setForm(EMPTY); setDialog(true); };
  const openEdit = (item: PricingOption) => {
    setEditItem(item);
    const cfg = item.config as { startDate?: string; endDate?: string } | undefined;
    setForm({
      optionKey: item.optionKey, label: item.label,
      description: item.description ?? "", startDate: cfg?.startDate ?? "",
      endDate: cfg?.endDate ?? "", sortOrder: String(item.sortOrder), isActive: item.isActive,
    });
    setDialog(true);
  };
  const closeDialog = () => { setDialog(false); setEditItem(null); setForm(EMPTY); setSaveError(null); };

  const items = (data ?? []).sort((a, b) => a.sortOrder - b.sortOrder);

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-teal-600" />
            <h2 className="text-lg font-semibold">Mùa giá</h2>
          </div>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Định nghĩa các mùa giá theo thời điểm. Khi tạo bảng giá phòng, chọn mùa tương ứng để áp giá riêng.
          </p>
        </div>
        <Button size="sm" className="bg-teal-600 hover:bg-teal-700 h-8" onClick={openAdd}>
          <Plus className="mr-1 h-3 w-3" /> Thêm mùa
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-[var(--muted-foreground)] py-4 text-center">
          Chưa có mùa giá nào. Giá phòng sẽ dùng "Mặc định" (quanh năm).
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const cfg = item.config as { startDate?: string; endDate?: string } | undefined;
          return (
            <div key={item.id} className="rounded-lg border border-[var(--border)] p-3 group hover:border-teal-300 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-semibold text-sm">{item.label}</span>
                  <span className="ml-2 font-mono text-xs text-[var(--muted-foreground)]">{item.optionKey}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEdit(item)}><Pencil className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400" onClick={() => setDeleteTarget(item)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
              {cfg?.startDate && cfg?.endDate && (
                <p className={`text-xs mt-1 ${isCrossYear(cfg.startDate, cfg.endDate) ? "text-amber-600" : "text-teal-600"}`}>
                  {describeRange(cfg.startDate, cfg.endDate)}
                </p>
              )}
              {item.description && (
                <p className="text-xs text-[var(--muted-foreground)] mt-1 line-clamp-2">{item.description}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={dialog} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? "Sửa mùa giá" : "Thêm mùa giá"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Tên mùa giá *</label>
              <Input value={form.label} placeholder="VD: Cao điểm Hè"
                onChange={(e) => {
                  const label = e.target.value;
                  setForm((f) => ({ ...f, label, ...(!editItem ? { optionKey: slugify(label) } : {}) }));
                }} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted-foreground)]">Mã hệ thống</label>
              <Input value={form.optionKey} disabled={!!editItem}
                onChange={(e) => setForm((f) => ({ ...f, optionKey: e.target.value }))}
                className="font-mono text-xs" />
              <p className="text-[10px] text-[var(--muted-foreground)]">{editItem ? "Không thay đổi sau khi tạo" : "Tự động từ tên — sửa nếu cần"}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Start date: month + day */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Bắt đầu *</label>
                <div className="flex gap-1.5">
                  <select className={selectCls} value={parseMmDd(form.startDate).month}
                    onChange={(e) => {
                      const m = Number(e.target.value);
                      const d = Math.min(parseMmDd(form.startDate).day || 1, DAYS_IN_MONTH[m - 1] ?? 31);
                      setForm((f) => ({ ...f, startDate: buildMmDd(m, d) }));
                    }}>
                    <option value={0}>Tháng</option>
                    {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <select className={selectCls} style={{ width: 72 }} value={parseMmDd(form.startDate).day}
                    onChange={(e) => {
                      const m = parseMmDd(form.startDate).month || 1;
                      setForm((f) => ({ ...f, startDate: buildMmDd(m, Number(e.target.value)) }));
                    }}>
                    <option value={0}>Ngày</option>
                    {Array.from({ length: DAYS_IN_MONTH[(parseMmDd(form.startDate).month || 1) - 1] ?? 31 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* End date: month + day */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Kết thúc *</label>
                <div className="flex gap-1.5">
                  <select className={selectCls} value={parseMmDd(form.endDate).month}
                    onChange={(e) => {
                      const m = Number(e.target.value);
                      const d = Math.min(parseMmDd(form.endDate).day || 1, DAYS_IN_MONTH[m - 1] ?? 31);
                      setForm((f) => ({ ...f, endDate: buildMmDd(m, d) }));
                    }}>
                    <option value={0}>Tháng</option>
                    {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <select className={selectCls} style={{ width: 72 }} value={parseMmDd(form.endDate).day}
                    onChange={(e) => {
                      const m = parseMmDd(form.endDate).month || 1;
                      setForm((f) => ({ ...f, endDate: buildMmDd(m, Number(e.target.value)) }));
                    }}>
                    <option value={0}>Ngày</option>
                    {Array.from({ length: DAYS_IN_MONTH[(parseMmDd(form.endDate).month || 1) - 1] ?? 31 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            {/* Range preview with cross-year detection */}
            {form.startDate && form.endDate && (
              <div className={`text-xs px-2 py-1 rounded ${isCrossYear(form.startDate, form.endDate)
                ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                : "bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400"}`}>
                {describeRange(form.startDate, form.endDate)}
                {isCrossYear(form.startDate, form.endDate) && (
                  <span className="block text-[10px] opacity-80 mt-0.5">VD: Tháng 11 năm nay → Tháng 2 năm sau</span>
                )}
              </div>
            )}
            <p className="text-[10px] text-[var(--muted-foreground)]">Mùa giá lặp lại hàng năm. Nếu bắt đầu &gt; kết thúc = qua năm sau.</p>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Mô tả</label>
              <Textarea rows={2} value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="VD: Mùa cao điểm du lịch hè, giá tăng 20-30%" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Thứ tự</label>
                <Input type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="seasonActive" checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="h-4 w-4 rounded" />
                <label htmlFor="seasonActive" className="text-sm font-medium">Kích hoạt</label>
              </div>
            </div>
          </div>
          {saveError && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">
              {saveError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Hủy</Button>
            <Button className="bg-teal-600 hover:bg-teal-700"
              disabled={saveMutation.isPending || !form.optionKey || !form.label || !MM_DD_REGEX.test(form.startDate) || !MM_DD_REGEX.test(form.endDate)}
              onClick={() => { setSaveError(null); saveMutation.mutate(); }}>
              {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}
        title="Xóa mùa giá"
        description={`Xóa "${deleteTarget?.label}"? Các bảng giá đang dùng mùa này sẽ không bị xóa nhưng sẽ không tìm thấy mùa tương ứng.`}
        confirmLabel="Xóa" variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
