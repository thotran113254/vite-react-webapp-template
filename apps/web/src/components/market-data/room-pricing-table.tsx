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
  EMPTY_ROOM_PRICING,
  type RoomPricingFormState,
} from "@/components/market-data/room-pricing-form-dialog";
import type { PropertyRoom, RoomPricing } from "@app/shared";

/** Pricing management table for a single room with full CRUD. */
export function PricingTable({ room, isAdmin }: { room: PropertyRoom; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const { comboOptions, dayOptions, seasonOptions, comboLabel, dayLabel, seasonLabel, isLoading: optionsLoading } = usePricingOptions();
  const [pricingDialog, setPricingDialog] = useState(false);
  const [editPricing, setEditPricing] = useState<RoomPricing | null>(null);
  const [pForm, setPForm] = useState<RoomPricingFormState>(EMPTY_ROOM_PRICING);
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
        seasonName: pForm.seasonName || "default",
        standardGuests: Number(pForm.standardGuests), price: Number(pForm.price),
        pricePlus1: pForm.pricePlus1 ? Number(pForm.pricePlus1) : null,
        priceMinus1: pForm.priceMinus1 ? Number(pForm.priceMinus1) : null,
        extraNight: pForm.extraNight ? Number(pForm.extraNight) : null,
        discountPrice: pForm.discountPrice ? Number(pForm.discountPrice) : null,
        discountPricePlus1: pForm.discountPricePlus1 ? Number(pForm.discountPricePlus1) : null,
        discountPriceMinus1: pForm.discountPriceMinus1 ? Number(pForm.discountPriceMinus1) : null,
        underStandardPrice: pForm.underStandardPrice ? Number(pForm.underStandardPrice) : null,
        extraAdultSurcharge: pForm.extraAdultSurcharge ? Number(pForm.extraAdultSurcharge) : null,
        extraChildSurcharge: pForm.extraChildSurcharge ? Number(pForm.extraChildSurcharge) : null,
        includedAmenities: pForm.includedAmenities || null,
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
      ...EMPTY_ROOM_PRICING,
      comboType: comboOptions[0]?.optionKey ?? "",
      dayType: dayOptions[0]?.optionKey ?? "",
      seasonName: "default",
      standardGuests: String(room.capacity),
    });
    setPricingDialog(true);
  };

  const openEdit = (p: RoomPricing) => {
    setEditPricing(p);
    setPForm({
      comboType: p.comboType, dayType: p.dayType, seasonName: p.seasonName || "default",
      standardGuests: String(p.standardGuests), price: String(p.price),
      pricePlus1: p.pricePlus1 ? String(p.pricePlus1) : "",
      priceMinus1: p.priceMinus1 ? String(p.priceMinus1) : "",
      extraNight: p.extraNight ? String(p.extraNight) : "",
      discountPrice: p.discountPrice ? String(p.discountPrice) : "",
      discountPricePlus1: p.discountPricePlus1 ? String(p.discountPricePlus1) : "",
      discountPriceMinus1: p.discountPriceMinus1 ? String(p.discountPriceMinus1) : "",
      underStandardPrice: p.underStandardPrice ? String(p.underStandardPrice) : "",
      extraAdultSurcharge: p.extraAdultSurcharge ? String(p.extraAdultSurcharge) : "",
      extraChildSurcharge: p.extraChildSurcharge ? String(p.extraChildSurcharge) : "",
      includedAmenities: p.includedAmenities ?? "",
    });
    setPricingDialog(true);
  };

  const closePricingDialog = () => {
    setPricingDialog(false);
    setEditPricing(null);
    setPForm(EMPTY_ROOM_PRICING);
    setSaveError(null);
  };

  const pricings = data ?? [];
  /* Group: season → combo → prices */
  const bySeason = new Map<string, Map<string, RoomPricing[]>>();
  for (const p of pricings) {
    const sKey = p.seasonName || "default";
    if (!bySeason.has(sKey)) bySeason.set(sKey, new Map());
    const comboMap = bySeason.get(sKey)!;
    const arr = comboMap.get(p.comboType) ?? [];
    arr.push(p);
    comboMap.set(p.comboType, arr);
  }
  const hasMultipleSeasons = bySeason.size > 1;

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

      {Array.from(bySeason.entries()).map(([season, comboMap]) => (
        <div key={season} className={hasMultipleSeasons ? "border-l-2 border-teal-200 pl-2 mb-2" : ""}>
          {hasMultipleSeasons && (
            <p className="text-[10px] font-semibold text-teal-600 uppercase tracking-wider mb-1">{seasonLabel(season)}</p>
          )}
          {Array.from(comboMap.entries()).map(([combo, prices]) => (
            <div key={combo} className="mb-1">
              <p className="text-xs font-semibold text-teal-700 mb-1">{comboLabel(combo)}</p>
              <div className="grid grid-cols-4 gap-1 text-xs">
                {prices.sort((a, b) => (a.dayType > b.dayType ? 1 : -1)).map((p) => (
                  <div key={p.id} className="flex flex-col gap-0.5 rounded bg-[var(--muted)]/30 px-2 py-1 group">
                    <div className="flex items-center gap-1">
                      <span className="text-[var(--muted-foreground)]">{dayLabel(p.dayType)}:</span>
                      <span className="font-medium text-[var(--foreground)]">{fmtVnd(p.price)}</span>
                      {isAdmin && (
                        <div className="ml-auto flex gap-0.5 opacity-0 group-hover:opacity-100">
                          <button className="text-[var(--muted-foreground)] hover:text-teal-600" onClick={() => openEdit(p)}><Pencil className="h-2.5 w-2.5" /></button>
                          <button className="text-[var(--muted-foreground)] hover:text-red-600" onClick={() => setDeleteTarget(p)}><Trash2 className="h-2.5 w-2.5" /></button>
                        </div>
                      )}
                    </div>
                    {isAdmin && p.discountPrice != null && (
                      <span className="text-orange-500 text-[10px]">CK: {fmtVnd(p.discountPrice)}</span>
                    )}
                    {p.underStandardPrice != null && (
                      <span className="text-blue-500 text-[10px]">Dưới TC: {fmtVnd(p.underStandardPrice)}</span>
                    )}
                    {p.extraAdultSurcharge != null && (
                      <span className="text-[var(--muted-foreground)] text-[10px]">+NL: {fmtVnd(p.extraAdultSurcharge)}</span>
                    )}
                    {p.extraChildSurcharge != null && (
                      <span className="text-[var(--muted-foreground)] text-[10px]">+TE: {fmtVnd(p.extraChildSurcharge)}</span>
                    )}
                    {p.includedAmenities && (
                      <span className="text-green-600 text-[10px] truncate" title={p.includedAmenities}>{p.includedAmenities}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      <RoomPricingFormDialog
        open={pricingDialog}
        onClose={closePricingDialog}
        form={pForm}
        setForm={setPForm}
        isEditing={!!editPricing}
        isAdmin={isAdmin}
        isSaving={saveMutation.isPending}
        onSave={() => { setSaveError(null); saveMutation.mutate(); }}
        saveError={saveError}
        comboOptions={comboOptions}
        dayOptions={dayOptions}
        seasonOptions={seasonOptions}
      />

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
