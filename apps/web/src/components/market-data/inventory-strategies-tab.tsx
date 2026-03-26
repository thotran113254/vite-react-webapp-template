import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD, TableHeaderRow } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AiVisibilityToggle } from "@/components/market-data/ai-visibility-toggle";
import { Spinner } from "@/components/ui/spinner";
import { apiClient } from "@/lib/api-client";
import type { MarketInventoryStrategy } from "@app/shared";

interface InventoryStrategiesTabProps {
  marketId: string;
  isAdmin: boolean;
}

type FormState = {
  monthRange: string;
  seasonName: string;
  demandLevel: string;
  priceVariation: string;
  holdingType: string;
  targetSegment: string;
  applicablePeriods: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  monthRange: "", seasonName: "", demandLevel: "",
  priceVariation: "", holdingType: "", targetSegment: "",
  applicablePeriods: "", notes: "",
};

const DEMAND_VARIANT: Record<string, "success" | "warning" | "danger" | "secondary"> = {
  cao: "success", trung_bình: "warning", thấp: "danger",
};

/** Inventory strategies tab: seasonal demand and holding strategies with CRUD. */
export function InventoryStrategiesTab({ marketId, isAdmin }: InventoryStrategiesTabProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<MarketInventoryStrategy | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ["inventory-strategies", marketId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: MarketInventoryStrategy[] }>(`/markets/${marketId}/inventory-strategies`);
      return res.data.data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v || null]));
      if (editItem) {
        await apiClient.patch(`/markets/${marketId}/inventory-strategies/${editItem.id}`, payload);
      } else {
        await apiClient.post(`/markets/${marketId}/inventory-strategies`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-strategies", marketId] });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/markets/${marketId}/inventory-strategies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-strategies", marketId] });
      setDeleteId(null);
    },
  });

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (item: MarketInventoryStrategy) => {
    setEditItem(item);
    setForm({
      monthRange: item.monthRange,
      seasonName: item.seasonName ?? "",
      demandLevel: item.demandLevel ?? "",
      priceVariation: item.priceVariation ?? "",
      holdingType: item.holdingType ?? "",
      targetSegment: item.targetSegment ?? "",
      applicablePeriods: item.applicablePeriods ?? "",
      notes: item.notes ?? "",
    });
    setDialogOpen(true);
  };

  const items = data ?? [];

  const tf = (key: keyof FormState, label: string, multi = false) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      {multi
        ? <Textarea rows={2} value={form[key]} onChange={(e) => setForm((s) => ({ ...s, [key]: e.target.value }))} />
        : <Input value={form[key]} onChange={(e) => setForm((s) => ({ ...s, [key]: e.target.value }))} />
      }
    </div>
  );

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> Thêm mới
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <Table>
          <THead>
            <TableHeaderRow>
              <TH>Khoảng tháng</TH>
              <TH>Mùa</TH>
              <TH>Mức cầu</TH>
              <TH>Loại ôm quỹ</TH>
              <TH>Phân khúc mục tiêu</TH>
              <TH>AI</TH>
              {isAdmin && <TH className="w-24">Thao tác</TH>}
            </TableHeaderRow>
          </THead>
          <TBody>
            {items.length === 0 ? (
              <TR><TD colSpan={isAdmin ? 7 : 6} className="py-8 text-center text-[var(--muted-foreground)]">Chưa có dữ liệu</TD></TR>
            ) : items.map((item) => (
              <TR key={item.id}>
                <TD className="font-medium text-[var(--foreground)]">{item.monthRange}</TD>
                <TD className="text-sm text-[var(--muted-foreground)]">{item.seasonName ?? "—"}</TD>
                <TD>
                  {item.demandLevel
                    ? <Badge variant={DEMAND_VARIANT[item.demandLevel] ?? "secondary"}>{item.demandLevel}</Badge>
                    : "—"}
                </TD>
                <TD className="text-sm text-[var(--muted-foreground)]">{item.holdingType ?? "—"}</TD>
                <TD className="text-sm text-[var(--muted-foreground)]">{item.targetSegment ?? "—"}</TD>
                <TD>
                  <AiVisibilityToggle
                    entityType="inventory-strategy"
                    entityId={item.id}
                    enabled={item.aiVisible}
                    invalidateKeys={[["inventory-strategies", marketId]]}
                  />
                </TD>
                {isAdmin && (
                  <TD>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => setDeleteId(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TD>
                )}
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "Chỉnh sửa chiến lược" : "Thêm chiến lược mới"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 grid-cols-2">
            {tf("monthRange", "Khoảng tháng *")}
            {tf("seasonName", "Tên mùa")}
            {tf("demandLevel", "Mức cầu")}
            {tf("holdingType", "Loại ôm quỹ")}
            {tf("priceVariation", "Biến động giá")}
            {tf("targetSegment", "Phân khúc mục tiêu")}
            <div className="col-span-2">{tf("applicablePeriods", "Giai đoạn áp dụng")}</div>
            <div className="col-span-2">{tf("notes", "Ghi chú", true)}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={saveMutation.isPending || !form.monthRange}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Xóa chiến lược"
        description="Bạn có chắc muốn xóa chiến lược ôm quỹ phòng này không?"
        confirmLabel="Xóa"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
