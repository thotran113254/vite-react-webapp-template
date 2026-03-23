import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";
import { apiClient } from "@/lib/api-client";
import { fmtVnd } from "@/lib/format-currency";
import { usePricingOptions } from "@/hooks/use-pricing-options";
import {
  RoomPricingFormDialog,
  buildEmptyFormState,
  recordsToPeriods,
  type RoomPricingFormState,
} from "@/components/market-data/room-pricing-form-dialog";
import type { SurchargeRule } from "@/components/market-data/surcharge-rules-editor";
import type { PropertyRoom, RoomPricing } from "@app/shared";

/** Compute margin % between listed and discount price */
function marginPct(price: number, discountPrice: number | null): number | null {
  if (!discountPrice || price <= 0) return null;
  return Math.round(((price - discountPrice) / price) * 100);
}

function MarginBadge({ pct }: { pct: number | null }) {
  if (pct == null) return null;
  const cls = pct > 20 ? "text-green-600" : pct >= 10 ? "text-yellow-600" : "text-red-600";
  return <span className={`text-[10px] font-medium ${cls}`}>BLN {pct}%</span>;
}

/** Pricing management table for a single room — period-based display with full CRUD. */
export function PricingTable({ room, isAdmin }: { room: PropertyRoom; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const { dayOptions, dayLabel, isLoading: optionsLoading } = usePricingOptions();
  const [pricingDialog, setPricingDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [pForm, setPForm] = useState<RoomPricingFormState>(() => buildEmptyFormState([]));
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null); // seasonName|seasonStart to delete
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
      const pricings = data ?? [];
      const ops: Promise<unknown>[] = [];

      for (const period of pForm.periods) {
        for (const [dayKey, dp] of Object.entries(period.dayPrices)) {
          if (!dp.price) continue;
          const payload = {
            comboType: "per_night",
            dayType: dayKey,
            seasonName: period.seasonName || "default",
            seasonStart: period.seasonStart || null,
            seasonEnd: period.seasonEnd || null,
            standardGuests: Number(pForm.standardGuests) || 2,
            price: Number(dp.price),
            discountPrice: dp.discountPrice ? Number(dp.discountPrice) : null,
            extraAdultSurcharge: pForm.extraAdultSurcharge ? Number(pForm.extraAdultSurcharge) : null,
            surchargeRules: pForm.surchargeRules,
            includedAmenities: pForm.includedAmenities || null,
            notes: pForm.notes || null,
          };
          // Find existing record matching this period+day
          const existing = pricings.find(
            (r) => r.dayType === dayKey &&
              r.seasonName === (period.seasonName || "default") &&
              (r.seasonStart ?? "") === (period.seasonStart ?? ""),
          );
          if (existing) {
            ops.push(apiClient.patch(`/rooms/${room.id}/pricing/${existing.id}`, payload));
          } else {
            ops.push(apiClient.post(`/rooms/${room.id}/pricing`, payload));
          }
        }
      }
      await Promise.all(ops);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qk }); closePricingDialog(); },
    onError: (err: any) => {
      setSaveError(err?.response?.data?.message ?? err?.message ?? "Lỗi lưu giá");
    },
  });

  const deleteSeasonMutation = useMutation({
    mutationFn: async (key: string) => {
      const [seasonName, seasonStart] = key.split("|");
      const pricings = data ?? [];
      const targets = pricings.filter(
        (r) => r.seasonName === seasonName && (r.seasonStart ?? "") === (seasonStart ?? ""),
      );
      await Promise.all(targets.map((r) => apiClient.delete(`/rooms/${room.id}/pricing/${r.id}`)));
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qk }); setDeleteTarget(null); },
  });

  const openAdd = () => {
    setIsEditing(false);
    setPForm(buildEmptyFormState(dayOptions));
    setPricingDialog(true);
  };

  const openEdit = (pricings: RoomPricing[]) => {
    if (!pricings.length) return;
    const first = pricings[0]!;
    const periods = recordsToPeriods(pricings, dayOptions);
    const surchargeRules = (first.surchargeRules ?? []) as SurchargeRule[];
    setPForm({
      periods,
      standardGuests: String(first.standardGuests),
      includedAmenities: first.includedAmenities ?? "",
      extraAdultSurcharge: first.extraAdultSurcharge ? String(first.extraAdultSurcharge) : "",
      surchargeRules,
      notes: first.notes ?? "",
    });
    setIsEditing(true);
    setPricingDialog(true);
  };

  const closePricingDialog = () => {
    setPricingDialog(false);
    setIsEditing(false);
    setPForm(buildEmptyFormState(dayOptions));
    setSaveError(null);
  };

  const pricings = data ?? [];

  // Group by season key (seasonName|seasonStart)
  const byPeriod = new Map<string, RoomPricing[]>();
  for (const p of pricings) {
    const key = `${p.seasonName}|${p.seasonStart ?? ""}`;
    const arr = byPeriod.get(key) ?? [];
    arr.push(p);
    byPeriod.set(key, arr);
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

      {pricings.length === 0 && (
        <p className="text-xs text-[var(--muted-foreground)]">Chưa có bảng giá</p>
      )}

      {Array.from(byPeriod.entries()).map(([key, rows]) => {
        const first = rows[0]!;
        const dateRange = first.seasonStart && first.seasonEnd
          ? ` (${first.seasonStart} → ${first.seasonEnd})`
          : "";
        const displayName = first.seasonName === "default" ? "Mặc định" : first.seasonName;
        return (
          <div key={key} className="border-l-2 border-teal-200 pl-2 mb-2">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[10px] font-semibold text-teal-600 uppercase tracking-wider">
                {displayName}{dateRange}
              </p>
              {isAdmin && (
                <>
                  <button
                    className="text-[var(--muted-foreground)] hover:text-teal-600"
                    title="Sửa giai đoạn"
                    onClick={() => openEdit(rows)}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    className="text-[var(--muted-foreground)] hover:text-red-600"
                    title="Xóa giai đoạn"
                    onClick={() => setDeleteTarget(key)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1 text-xs">
              {rows.sort((a, b) => (a.dayType > b.dayType ? 1 : -1)).map((p) => {
                const margin = marginPct(p.price, p.discountPrice ?? null);
                return (
                  <div key={p.id} className="flex flex-col gap-0.5 rounded bg-[var(--muted)]/30 px-2 py-1">
                    <span className="text-[var(--muted-foreground)]">{dayLabel(p.dayType)}</span>
                    {isAdmin ? (
                      <>
                        <span className="font-medium">{fmtVnd(p.price)}</span>
                        {p.discountPrice != null && (
                          <span className="text-orange-500 text-[10px]">CK: {fmtVnd(p.discountPrice)}</span>
                        )}
                        <MarginBadge pct={margin} />
                      </>
                    ) : (
                      <span className="text-[var(--muted-foreground)] italic text-[10px]">---</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <RoomPricingFormDialog
        open={pricingDialog}
        onClose={closePricingDialog}
        form={pForm}
        setForm={setPForm}
        isEditing={isEditing}
        isAdmin={isAdmin}
        isSaving={saveMutation.isPending}
        onSave={() => { setSaveError(null); saveMutation.mutate(); }}
        saveError={saveError}
        dayOptions={dayOptions}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Xóa giai đoạn giá"
        description="Xóa toàn bộ giá trong giai đoạn này?"
        confirmLabel="Xóa"
        variant="destructive"
        onConfirm={() => deleteTarget && deleteSeasonMutation.mutate(deleteTarget)}
        isLoading={deleteSeasonMutation.isPending}
      />
    </div>
  );
}
