import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { usePricingOptions } from "@/hooks/use-pricing-options";
import {
  RoomPricingFormDialog, EMPTY_ROOM_PRICING,
  type RoomPricingFormState,
} from "@/components/market-data/room-pricing-form-dialog";
import { apiClient } from "@/lib/api-client";
import { fmtVnd } from "@/lib/format-currency";
import type { PropertyRoom, RoomPricing } from "@app/shared";

/** Spreadsheet-style price matrix with full CRUD: click cell to add/edit, × to delete. */
export function PricingPriceMatrix({ room, isAdmin }: { room: PropertyRoom; isAdmin: boolean }) {
  const qc = useQueryClient();
  const { comboOptions, dayOptions, seasonOptions, comboLabel, dayLabel } = usePricingOptions();
  const [season, setSeason] = useState("default");
  const [dialog, setDialog] = useState(false);
  const [editItem, setEditItem] = useState<RoomPricing | null>(null);
  const [form, setForm] = useState<RoomPricingFormState>(EMPTY_ROOM_PRICING);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoomPricing | null>(null);

  const qk = ["room-pricing", room.id];
  const { data = [], isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => {
      const res = await apiClient.get<{ data: RoomPricing[] }>(`/rooms/${room.id}/pricing`);
      return res.data.data ?? [];
    },
  });

  const lookup = new Map<string, RoomPricing>();
  for (const p of data) {
    if ((p.seasonName || "default") === season) lookup.set(`${p.comboType}|${p.dayType}`, p);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const n = (v: string) => v ? Number(v) : null;
      const payload = {
        comboType: form.comboType, dayType: form.dayType,
        seasonName: form.seasonName || "default",
        standardGuests: Number(form.standardGuests), price: Number(form.price),
        pricePlus1: n(form.pricePlus1), priceMinus1: n(form.priceMinus1),
        extraNight: n(form.extraNight), discountPrice: n(form.discountPrice),
        discountPricePlus1: n(form.discountPricePlus1), discountPriceMinus1: n(form.discountPriceMinus1),
        underStandardPrice: n(form.underStandardPrice),
        extraAdultSurcharge: n(form.extraAdultSurcharge), extraChildSurcharge: n(form.extraChildSurcharge),
        includedAmenities: form.includedAmenities || null,
      };
      if (editItem) await apiClient.patch(`/rooms/${room.id}/pricing/${editItem.id}`, payload);
      else await apiClient.post(`/rooms/${room.id}/pricing`, payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk }); closeDialog(); },
    onError: (err: any) => { setSaveError(err?.response?.data?.message ?? "Lỗi lưu giá"); },
  });

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/rooms/${room.id}/pricing/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk }); setDeleteTarget(null); setDeleteError(null); },
    onError: (err: any) => { setDeleteError(err?.response?.data?.message ?? "Lỗi xóa giá"); },
  });

  const openCell = (comboKey: string, dayKey: string) => {
    if (!isAdmin) return;
    const existing = lookup.get(`${comboKey}|${dayKey}`);
    if (existing) {
      setEditItem(existing);
      const s = (v: number | null | undefined) => (v != null ? String(v) : "");
      setForm({
        comboType: existing.comboType, dayType: existing.dayType,
        seasonName: existing.seasonName || "default",
        standardGuests: String(existing.standardGuests), price: String(existing.price),
        pricePlus1: s(existing.pricePlus1), priceMinus1: s(existing.priceMinus1),
        extraNight: s(existing.extraNight), discountPrice: s(existing.discountPrice),
        discountPricePlus1: s(existing.discountPricePlus1), discountPriceMinus1: s(existing.discountPriceMinus1),
        underStandardPrice: s(existing.underStandardPrice),
        extraAdultSurcharge: s(existing.extraAdultSurcharge), extraChildSurcharge: s(existing.extraChildSurcharge),
        includedAmenities: existing.includedAmenities ?? "",
      });
    } else {
      setEditItem(null);
      setForm({ ...EMPTY_ROOM_PRICING, comboType: comboKey, dayType: dayKey, seasonName: season, standardGuests: String(room.capacity) });
    }
    setSaveError(null);
    setDialog(true);
  };

  const openAdd = () => {
    setEditItem(null);
    setForm({
      ...EMPTY_ROOM_PRICING,
      comboType: comboOptions[0]?.optionKey ?? "",
      dayType: dayOptions[0]?.optionKey ?? "",
      seasonName: season,
      standardGuests: String(room.capacity),
    });
    setSaveError(null);
    setDialog(true);
  };

  const closeDialog = () => { setDialog(false); setEditItem(null); setSaveError(null); };

  if (isLoading) return <Spinner size="sm" />;

  return (
    <div>
      {/* Season pills + Add button */}
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex gap-1 flex-wrap">
          {seasonOptions.length > 0 && (
            <>
              <button onClick={() => setSeason("default")}
                className={`px-2.5 py-1 text-xs rounded-full transition-colors ${season === "default" ? "bg-teal-600 text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-teal-100 dark:hover:bg-teal-900/30"}`}>
                Mặc định
              </button>
              {seasonOptions.map((s) => (
                <button key={s.optionKey} onClick={() => setSeason(s.optionKey)}
                  className={`px-2.5 py-1 text-xs rounded-full transition-colors ${season === s.optionKey ? "bg-teal-600 text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-teal-100 dark:hover:bg-teal-900/30"}`}>
                  {s.label}
                </button>
              ))}
            </>
          )}
        </div>
        {isAdmin && (
          <Button size="sm" variant="ghost" className="text-xs text-teal-600 h-6 px-2 shrink-0" onClick={openAdd}>
            <Plus className="mr-0.5 h-3 w-3" /> Thêm giá
          </Button>
        )}
      </div>

      {/* Price grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left p-1.5 text-[var(--muted-foreground)] font-medium w-24" />
              {comboOptions.map((c) => (
                <th key={c.optionKey} className="text-center p-1.5 text-teal-700 dark:text-teal-400 font-semibold">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dayOptions.map((d) => (
              <tr key={d.optionKey} className="border-b border-[var(--border)]/50">
                <td className="p-1.5 text-[var(--muted-foreground)] font-medium whitespace-nowrap">{d.label}</td>
                {comboOptions.map((c) => {
                  const p = lookup.get(`${c.optionKey}|${d.optionKey}`);
                  return (
                    <td key={c.optionKey} className="p-0.5 text-center">
                      <div className="relative group">
                        <button onClick={() => openCell(c.optionKey, d.optionKey)}
                          disabled={!isAdmin}
                          title={p ? `Click để sửa` : "Click để thêm giá"}
                          className={`w-full px-2 py-1.5 rounded transition-colors ${isAdmin ? "cursor-pointer" : "cursor-default"} ${
                            p ? "font-medium text-[var(--foreground)] hover:bg-teal-50 dark:hover:bg-teal-900/20"
                              : "text-[var(--muted-foreground)]/40 hover:bg-[var(--muted)]/50"}`}>
                          {p ? fmtVnd(p.price) : (isAdmin ? <Plus className="h-3 w-3 mx-auto opacity-30" /> : "—")}
                          {isAdmin && p?.discountPrice != null && (
                            <span className="block text-[10px] text-orange-500 leading-tight">{fmtVnd(p.discountPrice)}</span>
                          )}
                        </button>
                        {/* Delete button on hover */}
                        {isAdmin && p && (
                          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }}
                            className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity hidden group-hover:flex"
                            title="Xóa giá này">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit/Add dialog */}
      <RoomPricingFormDialog
        open={dialog} onClose={closeDialog}
        form={form} setForm={setForm}
        isEditing={!!editItem} isAdmin={isAdmin}
        isSaving={saveMutation.isPending}
        onSave={() => { setSaveError(null); saveMutation.mutate(); }}
        saveError={saveError}
        comboOptions={comboOptions} dayOptions={dayOptions}
        seasonOptions={seasonOptions}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}
        title="Xóa giá"
        description={`Xóa giá ${comboLabel(deleteTarget?.comboType ?? "")} - ${dayLabel(deleteTarget?.dayType ?? "")}?`}
        confirmLabel="Xóa" variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
