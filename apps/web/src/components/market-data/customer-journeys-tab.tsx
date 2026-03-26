import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, THead, TBody, TR, TH, TD, TableHeaderRow } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AiVisibilityToggle } from "@/components/market-data/ai-visibility-toggle";
import { Spinner } from "@/components/ui/spinner";
import { apiClient } from "@/lib/api-client";
import type { MarketCustomerJourney } from "@app/shared";

interface CustomerJourneysTabProps {
  marketId: string;
  isAdmin: boolean;
}

type FormState = {
  stageName: string;
  phaseName: string;
  stageOrder: string;
  customerActions: string;
  touchpoints: string;
  painpoints: string;
  customerInfoNeeds: string;
};

const EMPTY_FORM: FormState = {
  stageName: "", phaseName: "", stageOrder: "0",
  customerActions: "", touchpoints: "", painpoints: "", customerInfoNeeds: "",
};

/** Customer journeys tab: ordered table of journey stages with CRUD. */
export function CustomerJourneysTab({ marketId, isAdmin }: CustomerJourneysTabProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<MarketCustomerJourney | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ["customer-journeys", marketId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: MarketCustomerJourney[] }>(`/markets/${marketId}/customer-journeys`);
      return (res.data.data ?? []).sort((a, b) => a.stageOrder - b.stageOrder);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        stageName: form.stageName,
        phaseName: form.phaseName || null,
        stageOrder: Number(form.stageOrder),
        customerActions: form.customerActions || null,
        touchpoints: form.touchpoints || null,
        painpoints: form.painpoints || null,
        customerInfoNeeds: form.customerInfoNeeds || null,
      };
      if (editItem) {
        await apiClient.patch(`/markets/${marketId}/customer-journeys/${editItem.id}`, payload);
      } else {
        await apiClient.post(`/markets/${marketId}/customer-journeys`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-journeys", marketId] });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/markets/${marketId}/customer-journeys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-journeys", marketId] });
      setDeleteId(null);
    },
  });

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (item: MarketCustomerJourney) => {
    setEditItem(item);
    setForm({
      stageName: item.stageName,
      phaseName: item.phaseName ?? "",
      stageOrder: String(item.stageOrder),
      customerActions: item.customerActions ?? "",
      touchpoints: item.touchpoints ?? "",
      painpoints: item.painpoints ?? "",
      customerInfoNeeds: item.customerInfoNeeds ?? "",
    });
    setDialogOpen(true);
  };

  const items = data ?? [];

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
              <TH className="w-12">STT</TH>
              <TH>Phase</TH>
              <TH>Giai đoạn</TH>
              <TH>Hành động KH</TH>
              <TH>Touchpoints</TH>
              <TH>Painpoints</TH>
              <TH>AI</TH>
              {isAdmin && <TH className="w-24">Thao tác</TH>}
            </TableHeaderRow>
          </THead>
          <TBody>
            {items.length === 0 ? (
              <TR><TD colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-[var(--muted-foreground)]">Chưa có dữ liệu</TD></TR>
            ) : items.map((item) => (
              <TR key={item.id}>
                <TD className="text-center text-[var(--muted-foreground)]">{item.stageOrder}</TD>
                <TD className="text-sm text-[var(--muted-foreground)]">{item.phaseName ?? "—"}</TD>
                <TD className="font-medium text-[var(--foreground)]">{item.stageName}</TD>
                <TD className="text-sm text-[var(--muted-foreground)] max-w-[180px] truncate">{item.customerActions ?? "—"}</TD>
                <TD className="text-sm text-[var(--muted-foreground)] max-w-[180px] truncate">{item.touchpoints ?? "—"}</TD>
                <TD className="text-sm text-[var(--muted-foreground)] max-w-[180px] truncate">{item.painpoints ?? "—"}</TD>
                <TD>
                  <AiVisibilityToggle
                    entityType="customer-journey"
                    entityId={item.id}
                    enabled={item.aiVisible}
                    invalidateKeys={[["customer-journeys", marketId]]}
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
            <DialogTitle>{editItem ? "Chỉnh sửa giai đoạn" : "Thêm giai đoạn mới"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Tên giai đoạn *</label>
              <Input value={form.stageName} onChange={(e) => setForm((f) => ({ ...f, stageName: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Phase</label>
              <Input value={form.phaseName} onChange={(e) => setForm((f) => ({ ...f, phaseName: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Thứ tự</label>
              <Input type="number" value={form.stageOrder} onChange={(e) => setForm((f) => ({ ...f, stageOrder: e.target.value }))} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium">Hành động khách hàng</label>
              <Textarea rows={2} value={form.customerActions} onChange={(e) => setForm((f) => ({ ...f, customerActions: e.target.value }))} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium">Touchpoints</label>
              <Textarea rows={2} value={form.touchpoints} onChange={(e) => setForm((f) => ({ ...f, touchpoints: e.target.value }))} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium">Painpoints</label>
              <Textarea rows={2} value={form.painpoints} onChange={(e) => setForm((f) => ({ ...f, painpoints: e.target.value }))} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium">Nhu cầu thông tin KH</label>
              <Textarea rows={2} value={form.customerInfoNeeds} onChange={(e) => setForm((f) => ({ ...f, customerInfoNeeds: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" disabled={saveMutation.isPending || !form.stageName} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Xóa giai đoạn"
        description="Bạn có chắc muốn xóa giai đoạn hành trình này không?"
        confirmLabel="Xóa"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
