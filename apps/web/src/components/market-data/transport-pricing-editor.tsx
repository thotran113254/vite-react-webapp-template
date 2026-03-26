import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD, TableHeaderRow } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  TransportPricingFormDialog,
  EMPTY_PRICING_FORM,
  type TransportPricingFormState,
} from "@/components/market-data/transport-pricing-form-dialog";
import { apiClient } from "@/lib/api-client";
import { fmtVnd } from "@/lib/format-currency";
import type { TransportPricing } from "@app/shared";

interface TransportPricingEditorProps {
  providerId: string;
  isAdmin: boolean;
}

/** Inline pricing editor for a transport provider with full CRUD. */
export function TransportPricingEditor({ providerId, isAdmin }: TransportPricingEditorProps) {
  const queryClient = useQueryClient();
  const qk = ["transport-pricing", providerId];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<TransportPricing | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<TransportPricingFormState>(EMPTY_PRICING_FORM);

  const { data, isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => {
      const res = await apiClient.get<{ data: TransportPricing[] }>(`/transport-providers/${providerId}/pricing`);
      return res.data.data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        vehicleClass: form.vehicleClass,
        seatType: form.seatType,
        capacityPerUnit: Number(form.capacityPerUnit) || 1,
        onewayListedPrice: Number(form.onewayListedPrice),
        roundtripListedPrice: form.roundtripListedPrice ? Number(form.roundtripListedPrice) : null,
        onewayDiscountPrice: form.onewayDiscountPrice ? Number(form.onewayDiscountPrice) : null,
        roundtripDiscountPrice: form.roundtripDiscountPrice ? Number(form.roundtripDiscountPrice) : null,
        childFreeUnder: form.childFreeUnder ? Number(form.childFreeUnder) : null,
        childDiscountUnder: form.childDiscountUnder ? Number(form.childDiscountUnder) : null,
        childDiscountAmount: form.childDiscountAmount ? Number(form.childDiscountAmount) : null,
        onboardServices: form.onboardServices || null,
        crossProvinceSurcharges: form.crossProvinceSurchargesText
          .split("\n").map((l) => l.trim()).filter(Boolean)
          .map((line) => {
            const [province, ...rest] = line.split(":");
            return { province: (province ?? "").trim(), surcharge: Number((rest.join(":")).trim()) || 0 };
          }),
      };
      if (editItem) {
        await apiClient.patch(`/transport-providers/${providerId}/pricing/${editItem.id}`, payload);
      } else {
        await apiClient.post(`/transport-providers/${providerId}/pricing`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/transport-providers/${providerId}/pricing/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      setDeleteId(null);
    },
  });

  const openAdd = () => {
    setEditItem(null);
    setForm(EMPTY_PRICING_FORM);
    setDialogOpen(true);
  };

  const openEdit = (item: TransportPricing) => {
    setEditItem(item);
    setForm({
      vehicleClass: item.vehicleClass,
      seatType: item.seatType,
      capacityPerUnit: String(item.capacityPerUnit),
      onewayListedPrice: String(item.onewayListedPrice),
      roundtripListedPrice: item.roundtripListedPrice ? String(item.roundtripListedPrice) : "",
      onewayDiscountPrice: item.onewayDiscountPrice ? String(item.onewayDiscountPrice) : "",
      roundtripDiscountPrice: item.roundtripDiscountPrice ? String(item.roundtripDiscountPrice) : "",
      childFreeUnder: item.childFreeUnder ? String(item.childFreeUnder) : "",
      childDiscountUnder: item.childDiscountUnder ? String(item.childDiscountUnder) : "",
      childDiscountAmount: item.childDiscountAmount ? String(item.childDiscountAmount) : "",
      onboardServices: item.onboardServices ?? "",
      crossProvinceSurchargesText: ((item.crossProvinceSurcharges ?? []) as Array<{ province: string; surcharge: number }>)
        .map((s) => `${s.province}: ${s.surcharge}`).join("\n"),
    });
    setDialogOpen(true);
  };

  const items = data ?? [];
  const colSpan = isAdmin ? 8 : 6;

  return (
    <div className="mt-1 mb-2 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Bảng giá vé</p>
        {isAdmin && (
          <Button size="sm" variant="ghost" className="text-xs text-blue-600 h-6 px-2" onClick={openAdd}>
            <Plus className="mr-0.5 h-3 w-3" /> Thêm giá
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4"><Spinner size="sm" /></div>
      ) : (
        <Table>
          <THead>
            <TableHeaderRow>
              <TH>Hạng xe</TH>
              <TH>Loại ghế</TH>
              <TH>Sức chứa</TH>
              <TH>Giá 1 chiều</TH>
              <TH>Giá 2 chiều</TH>
              {isAdmin && <TH className="text-orange-600">CK 1 chiều</TH>}
              {isAdmin && <TH className="text-orange-600">CK 2 chiều</TH>}
              {isAdmin && <TH className="w-20">Thao tác</TH>}
            </TableHeaderRow>
          </THead>
          <TBody>
            {items.length === 0 ? (
              <TR><TD colSpan={colSpan} className="py-4 text-center text-xs text-[var(--muted-foreground)]">Chưa có bảng giá</TD></TR>
            ) : items.map((item) => (
              <TR key={item.id}>
                <TD className="text-sm font-medium">{item.vehicleClass}</TD>
                <TD className="text-sm text-[var(--muted-foreground)]">{item.seatType}</TD>
                <TD className="text-sm text-[var(--muted-foreground)]">{item.capacityPerUnit}</TD>
                <TD className="text-sm">{fmtVnd(item.onewayListedPrice)}</TD>
                <TD className="text-sm">{item.roundtripListedPrice ? fmtVnd(item.roundtripListedPrice) : "—"}</TD>
                {isAdmin && (
                  <TD className="text-sm text-orange-600">
                    {item.onewayDiscountPrice ? fmtVnd(item.onewayDiscountPrice) : "—"}
                  </TD>
                )}
                {isAdmin && (
                  <TD className="text-sm text-orange-600">
                    {item.roundtripDiscountPrice ? fmtVnd(item.roundtripDiscountPrice) : "—"}
                  </TD>
                )}
                {isAdmin && (
                  <TD>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(item)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => setDeleteId(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TD>
                )}
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <TransportPricingFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        setForm={setForm}
        isEditing={!!editItem}
        isAdmin={isAdmin}
        isSaving={saveMutation.isPending}
        onSave={() => saveMutation.mutate()}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Xóa giá vé"
        description="Bạn có chắc muốn xóa mức giá này không?"
        confirmLabel="Xóa"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
