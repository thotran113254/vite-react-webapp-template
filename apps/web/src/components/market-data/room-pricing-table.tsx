import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";
import { apiClient } from "@/lib/api-client";
import { usePricingOptions } from "@/hooks/use-pricing-options";
import type { PropertyRoom, RoomPricing } from "@app/shared";

const fmtVnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

type PricingForm = { comboType: string; dayType: string; standardGuests: string; price: string; pricePlus1: string; priceMinus1: string; extraNight: string };
const EMPTY_PRICING: PricingForm = { comboType: "", dayType: "", standardGuests: "2", price: "", pricePlus1: "", priceMinus1: "", extraNight: "" };

/** Pricing management table for a single room with full CRUD. */
export function PricingTable({ room, isAdmin }: { room: PropertyRoom; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const { comboOptions, dayOptions, comboLabel, dayLabel, isLoading: optionsLoading } = usePricingOptions();
  const [pricingDialog, setPricingDialog] = useState(false);
  const [editPricing, setEditPricing] = useState<RoomPricing | null>(null);
  const [pForm, setPForm] = useState<PricingForm>(EMPTY_PRICING);
  const [deleteTarget, setDeleteTarget] = useState<RoomPricing | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const qk = ["room-pricing", room.id];
  const { data, isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => {
      const res = await apiClient.get<{ data: RoomPricing[] }>(`/rooms/${room.id}/pricing`);
      return res.data.data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        comboType: pForm.comboType, dayType: pForm.dayType,
        standardGuests: Number(pForm.standardGuests), price: Number(pForm.price),
        pricePlus1: pForm.pricePlus1 ? Number(pForm.pricePlus1) : null,
        priceMinus1: pForm.priceMinus1 ? Number(pForm.priceMinus1) : null,
        extraNight: pForm.extraNight ? Number(pForm.extraNight) : null,
      };
      if (editPricing) {
        await apiClient.patch(`/rooms/${room.id}/pricing/${editPricing.id}`, payload);
      } else {
        await apiClient.post(`/rooms/${room.id}/pricing`, payload);
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qk }); closePricingDialog(); },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? "Lỗi lưu giá";
      setSaveError(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/rooms/${room.id}/pricing/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qk }); setDeleteTarget(null); },
  });

  const openAdd = () => {
    setEditPricing(null);
    setPForm({
      ...EMPTY_PRICING,
      comboType: comboOptions[0]?.optionKey ?? "",
      dayType: dayOptions[0]?.optionKey ?? "",
      standardGuests: String(room.capacity),
    });
    setPricingDialog(true);
  };

  const openEdit = (p: RoomPricing) => {
    setEditPricing(p);
    setPForm({
      comboType: p.comboType, dayType: p.dayType,
      standardGuests: String(p.standardGuests), price: String(p.price),
      pricePlus1: p.pricePlus1 ? String(p.pricePlus1) : "",
      priceMinus1: p.priceMinus1 ? String(p.priceMinus1) : "",
      extraNight: p.extraNight ? String(p.extraNight) : "",
    });
    setPricingDialog(true);
  };

  const closePricingDialog = () => {
    setPricingDialog(false);
    setEditPricing(null);
    setPForm(EMPTY_PRICING);
    setSaveError(null);
  };

  const pricings = data ?? [];
  const grouped = new Map<string, RoomPricing[]>();
  for (const p of pricings) {
    const arr = grouped.get(p.comboType) ?? [];
    arr.push(p);
    grouped.set(p.comboType, arr);
  }

  if (isLoading || optionsLoading) return <Spinner size="sm" />;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Bảng giá</p>
        {isAdmin && (
          <Button size="sm" variant="ghost" className="text-xs text-teal-600 h-6 px-2" onClick={openAdd}>
            <Plus className="mr-0.5 h-3 w-3" /> Thêm giá
          </Button>
        )}
      </div>

      {pricings.length === 0 && <p className="text-xs text-[var(--muted-foreground)]">Chưa có bảng giá</p>}

      {Array.from(grouped.entries()).map(([combo, prices]) => (
        <div key={combo}>
          <p className="text-xs font-semibold text-teal-700 mb-1">{comboLabel(combo)}</p>
          <div className="grid grid-cols-4 gap-1 text-xs">
            {prices.sort((a, b) => (a.dayType > b.dayType ? 1 : -1)).map((p) => (
              <div key={p.id} className="flex items-center gap-1 rounded bg-[var(--muted)]/30 px-2 py-1 group">
                <span className="text-[var(--muted-foreground)]">{dayLabel(p.dayType)}:</span>
                <span className="font-medium text-[var(--foreground)]">{fmtVnd(p.price)}</span>
                {isAdmin && (
                  <div className="ml-auto flex gap-0.5 opacity-0 group-hover:opacity-100">
                    <button className="text-[var(--muted-foreground)] hover:text-teal-600" onClick={() => openEdit(p)}><Pencil className="h-2.5 w-2.5" /></button>
                    <button className="text-[var(--muted-foreground)] hover:text-red-600" onClick={() => setDeleteTarget(p)}><Trash2 className="h-2.5 w-2.5" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Pricing add/edit dialog */}
      <Dialog open={pricingDialog} onOpenChange={(open) => { if (!open) closePricingDialog(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editPricing ? "Sửa giá" : "Thêm giá"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Combo *</label>
              <select className="flex h-9 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-1 text-sm" value={pForm.comboType} onChange={(e) => setPForm((f) => ({ ...f, comboType: e.target.value }))}>
                {comboOptions.map((o) => <option key={o.optionKey} value={o.optionKey}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Loại ngày *</label>
              <select className="flex h-9 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-1 text-sm" value={pForm.dayType} onChange={(e) => setPForm((f) => ({ ...f, dayType: e.target.value }))}>
                {dayOptions.map((o) => <option key={o.optionKey} value={o.optionKey}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1"><label className="text-sm font-medium">Số người TC *</label><Input type="number" value={pForm.standardGuests} onChange={(e) => setPForm((f) => ({ ...f, standardGuests: e.target.value }))} /></div>
            <div className="flex flex-col gap-1"><label className="text-sm font-medium">Giá (VND) *</label><Input type="number" value={pForm.price} onChange={(e) => setPForm((f) => ({ ...f, price: e.target.value }))} /></div>
            <div className="flex flex-col gap-1"><label className="text-sm font-medium">+1 người</label><Input type="number" value={pForm.pricePlus1} onChange={(e) => setPForm((f) => ({ ...f, pricePlus1: e.target.value }))} /></div>
            <div className="flex flex-col gap-1"><label className="text-sm font-medium">-1 người</label><Input type="number" value={pForm.priceMinus1} onChange={(e) => setPForm((f) => ({ ...f, priceMinus1: e.target.value }))} /></div>
            <div className="flex flex-col gap-1"><label className="text-sm font-medium">Thêm đêm</label><Input type="number" value={pForm.extraNight} onChange={(e) => setPForm((f) => ({ ...f, extraNight: e.target.value }))} /></div>
          </div>
          {saveError && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closePricingDialog}>Hủy</Button>
            <Button className="bg-teal-600 hover:bg-teal-700" disabled={saveMutation.isPending || !pForm.price} onClick={() => { setSaveError(null); saveMutation.mutate(); }}>
              {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete pricing confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Xóa bảng giá"
        description={`Xóa giá ${comboLabel(deleteTarget?.comboType ?? "")} - ${dayLabel(deleteTarget?.dayType ?? "")}?`}
        confirmLabel="Xóa"
        variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
