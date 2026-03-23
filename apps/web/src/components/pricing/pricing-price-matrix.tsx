import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { usePricingOptions } from "@/hooks/use-pricing-options";
import {
  RoomPricingFormDialog,
  buildEmptyFormState,
  recordsToPeriods,
  type RoomPricingFormState,
} from "@/components/market-data/room-pricing-form-dialog";
import type { SurchargeRule } from "@/components/market-data/surcharge-rules-editor";
import { apiClient } from "@/lib/api-client";
import { fmtVnd } from "@/lib/format-currency";
import type { PropertyRoom, RoomPricing } from "@app/shared";

function marginPct(price: number, discount: number | null): number | null {
  if (!discount || price <= 0) return null;
  return Math.round(((price - discount) / price) * 100);
}

function MarginBadge({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-[var(--muted-foreground)]/40">—</span>;
  const cls = pct > 20 ? "text-green-600" : pct >= 10 ? "text-yellow-600" : "text-red-500";
  return <span className={`text-[10px] font-semibold ${cls}`}>{pct}%</span>;
}

/** Spreadsheet-style price matrix grouped by period, with margin column. Admin-only pricing. */
export function PricingPriceMatrix({ room, isAdmin }: { room: PropertyRoom; isAdmin: boolean }) {
  const qc = useQueryClient();
  const { dayOptions, dayLabel } = usePricingOptions();
  const [dialog, setDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<RoomPricingFormState>(() => buildEmptyFormState([]));
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

  // Group by period key
  const byPeriod = new Map<string, RoomPricing[]>();
  for (const p of data) {
    const key = `${p.seasonName}|${p.seasonStart ?? ""}`;
    const arr = byPeriod.get(key) ?? [];
    arr.push(p);
    byPeriod.set(key, arr);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const ops: Promise<unknown>[] = [];
      for (const period of form.periods) {
        for (const [dayKey, dp] of Object.entries(period.dayPrices)) {
          if (!dp.price) continue;
          const payload = {
            comboType: "per_night",
            dayType: dayKey,
            seasonName: period.seasonName || "default",
            seasonStart: period.seasonStart || null,
            seasonEnd: period.seasonEnd || null,
            standardGuests: Number(form.standardGuests) || 2,
            price: Number(dp.price),
            discountPrice: dp.discountPrice ? Number(dp.discountPrice) : null,
            extraAdultSurcharge: form.extraAdultSurcharge ? Number(form.extraAdultSurcharge) : null,
            surchargeRules: form.surchargeRules,
            includedAmenities: form.includedAmenities || null,
            notes: form.notes || null,
          };
          const existing = data.find(
            (r) => r.dayType === dayKey &&
              r.seasonName === (period.seasonName || "default") &&
              (r.seasonStart ?? "") === (period.seasonStart ?? ""),
          );
          if (existing) ops.push(apiClient.patch(`/rooms/${room.id}/pricing/${existing.id}`, payload));
          else ops.push(apiClient.post(`/rooms/${room.id}/pricing`, payload));
        }
      }
      await Promise.all(ops);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk }); closeDialog(); },
    onError: (err: any) => { setSaveError(err?.response?.data?.message ?? "Lỗi lưu giá"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/rooms/${room.id}/pricing/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk }); setDeleteTarget(null); },
    onError: () => { setDeleteTarget(null); },
  });

  const openAdd = () => {
    setIsEditing(false);
    setForm(buildEmptyFormState(dayOptions));
    setSaveError(null);
    setDialog(true);
  };

  const openEditPeriod = (rows: RoomPricing[]) => {
    if (!rows.length || !isAdmin) return;
    const first = rows[0]!;
    setForm({
      periods: recordsToPeriods(rows, dayOptions),
      standardGuests: String(first.standardGuests),
      includedAmenities: first.includedAmenities ?? "",
      extraAdultSurcharge: first.extraAdultSurcharge ? String(first.extraAdultSurcharge) : "",
      surchargeRules: (first.surchargeRules ?? []) as SurchargeRule[],
      notes: first.notes ?? "",
    });
    setIsEditing(true);
    setSaveError(null);
    setDialog(true);
  };

  const closeDialog = () => { setDialog(false); setIsEditing(false); setSaveError(null); };

  if (isLoading) return <Spinner size="sm" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[var(--muted-foreground)]">{byPeriod.size} giai đoạn</span>
        {isAdmin && (
          <Button size="sm" variant="ghost" className="text-xs text-teal-600 h-6 px-2 shrink-0" onClick={openAdd}>
            <Plus className="mr-0.5 h-3 w-3" /> Thêm giá
          </Button>
        )}
      </div>

      {byPeriod.size === 0 && (
        <p className="text-xs text-[var(--muted-foreground)] text-center py-3">Chưa có bảng giá</p>
      )}

      {/* Per-period tables */}
      {Array.from(byPeriod.entries()).map(([key, rows]) => {
        const first = rows[0]!;
        const dateRange = first.seasonStart && first.seasonEnd
          ? ` · ${first.seasonStart} → ${first.seasonEnd}` : "";
        const displayName = first.seasonName === "default" ? "Mặc định" : first.seasonName;

        return (
          <div key={key} className="mb-3">
            <div
              className={`flex items-center gap-1.5 mb-1 ${isAdmin ? "cursor-pointer hover:text-teal-600" : ""}`}
              onClick={() => isAdmin && openEditPeriod(rows)}
              title={isAdmin ? "Click để sửa giai đoạn" : undefined}
            >
              <span className="text-[10px] font-semibold text-teal-600 uppercase tracking-wider">
                {displayName}{dateRange}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left p-1.5 text-[var(--muted-foreground)] font-medium">Loại ngày</th>
                    <th className="text-right p-1.5 text-[var(--muted-foreground)] font-medium">Niêm yết</th>
                    {isAdmin && <th className="text-right p-1.5 text-orange-500 font-medium">Chiết khấu</th>}
                    {isAdmin && <th className="text-right p-1.5 text-[var(--muted-foreground)] font-medium">Biên LN</th>}
                    {isAdmin && <th className="w-6" />}
                  </tr>
                </thead>
                <tbody>
                  {rows.sort((a, b) => a.dayType > b.dayType ? 1 : -1).map((p) => {
                    const margin = marginPct(p.price, p.discountPrice ?? null);
                    return (
                      <tr key={p.id} className="border-b border-[var(--border)]/40 group">
                        <td className="p-1.5 text-[var(--muted-foreground)]">{dayLabel(p.dayType)}</td>
                        <td className="p-1.5 text-right font-medium">
                          {isAdmin ? fmtVnd(p.price) : <span className="text-[var(--muted-foreground)]">---</span>}
                        </td>
                        {isAdmin && (
                          <td className="p-1.5 text-right text-orange-500">
                            {p.discountPrice != null ? fmtVnd(p.discountPrice) : "—"}
                          </td>
                        )}
                        {isAdmin && (
                          <td className="p-1.5 text-right"><MarginBadge pct={margin} /></td>
                        )}
                        {isAdmin && (
                          <td className="p-0.5">
                            <button
                              onClick={() => setDeleteTarget(p)}
                              className="h-5 w-5 rounded text-[var(--muted-foreground)] hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                              title="Xóa giá này"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <RoomPricingFormDialog
        open={dialog} onClose={closeDialog}
        form={form} setForm={setForm}
        isEditing={isEditing} isAdmin={isAdmin}
        isSaving={saveMutation.isPending}
        onSave={() => { setSaveError(null); saveMutation.mutate(); }}
        saveError={saveError}
        dayOptions={dayOptions}
      />

      <ConfirmDialog
        open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}
        title="Xóa giá"
        description={`Xóa giá ${dayLabel(deleteTarget?.dayType ?? "")}?`}
        confirmLabel="Xóa" variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
