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
import type { MarketTransportation } from "@app/shared";

interface TransportationTabProps {
  marketId: string;
  isAdmin: boolean;
}

type FormState = {
  routeSegment: string;
  transportType: string;
  departurePoints: string;
  arrivalPoints: string;
  duration: string;
  costInfo: string;
  convenienceNotes: string;
  suitableFor: string;
};

const EMPTY_FORM: FormState = {
  routeSegment: "", transportType: "", departurePoints: "",
  arrivalPoints: "", duration: "", costInfo: "",
  convenienceNotes: "", suitableFor: "",
};

/** Transportation tab: routes and transport options with CRUD. */
export function TransportationTab({ marketId, isAdmin }: TransportationTabProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<MarketTransportation | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ["transportation", marketId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: MarketTransportation[] }>(`/markets/${marketId}/transportation`);
      return res.data.data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v || null]));
      if (editItem) {
        await apiClient.patch(`/markets/${marketId}/transportation/${editItem.id}`, payload);
      } else {
        await apiClient.post(`/markets/${marketId}/transportation`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transportation", marketId] });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/markets/${marketId}/transportation/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transportation", marketId] });
      setDeleteId(null);
    },
  });

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (item: MarketTransportation) => {
    setEditItem(item);
    setForm({
      routeSegment: item.routeSegment,
      transportType: item.transportType,
      departurePoints: item.departurePoints ?? "",
      arrivalPoints: item.arrivalPoints ?? "",
      duration: item.duration ?? "",
      costInfo: item.costInfo ?? "",
      convenienceNotes: item.convenienceNotes ?? "",
      suitableFor: item.suitableFor ?? "",
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
              <TH>Tuyến đường</TH>
              <TH>Loại phương tiện</TH>
              <TH>Thời gian</TH>
              <TH>Chi phí</TH>
              <TH>AI</TH>
              {isAdmin && <TH className="w-24">Thao tác</TH>}
            </TableHeaderRow>
          </THead>
          <TBody>
            {items.length === 0 ? (
              <TR><TD colSpan={isAdmin ? 6 : 5} className="py-8 text-center text-[var(--muted-foreground)]">Chưa có dữ liệu</TD></TR>
            ) : items.map((item) => (
              <TR key={item.id}>
                <TD>
                  <p className="font-medium text-[var(--foreground)]">{item.routeSegment}</p>
                  {item.departurePoints && <p className="text-xs text-[var(--muted-foreground)]">{item.departurePoints} → {item.arrivalPoints}</p>}
                </TD>
                <TD className="text-sm text-[var(--muted-foreground)]">{item.transportType}</TD>
                <TD className="text-sm text-[var(--muted-foreground)]">{item.duration ?? "—"}</TD>
                <TD className="text-sm text-[var(--muted-foreground)]">{item.costInfo ?? "—"}</TD>
                <TD>
                  <AiVisibilityToggle
                    entityType="transportation"
                    entityId={item.id}
                    enabled={item.aiVisible}
                    invalidateKeys={[["transportation", marketId]]}
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
            <DialogTitle>{editItem ? "Chỉnh sửa phương tiện" : "Thêm phương tiện mới"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 grid-cols-2">
            <div className="col-span-2">{tf("routeSegment", "Tuyến đường *")}</div>
            {tf("transportType", "Loại phương tiện *")}
            {tf("duration", "Thời gian di chuyển")}
            {tf("departurePoints", "Điểm xuất phát")}
            {tf("arrivalPoints", "Điểm đến")}
            {tf("costInfo", "Thông tin chi phí")}
            {tf("suitableFor", "Phù hợp cho")}
            <div className="col-span-2">{tf("convenienceNotes", "Ghi chú tiện lợi", true)}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={saveMutation.isPending || !form.routeSegment || !form.transportType}
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
        title="Xóa phương tiện"
        description="Bạn có chắc muốn xóa tuyến phương tiện này không?"
        confirmLabel="Xóa"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
