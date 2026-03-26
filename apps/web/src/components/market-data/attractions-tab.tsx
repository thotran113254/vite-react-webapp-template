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
import { ImageManager } from "@/components/market-data/image-manager";
import { Spinner } from "@/components/ui/spinner";
import { apiClient } from "@/lib/api-client";
import type { MarketAttraction } from "@app/shared";

interface AttractionsTabProps {
  marketId: string;
  isAdmin: boolean;
}

type FormState = {
  name: string;
  type: string;
  position: string;
  natureDescription: string;
  experienceValue: string;
  popularity: string;
  bestTime: string;
  costInfo: string;
  suitableFor: string;
  images: string[];
};

const EMPTY_FORM: FormState = {
  name: "", type: "", position: "", natureDescription: "",
  experienceValue: "", popularity: "", bestTime: "", costInfo: "", suitableFor: "", images: [],
};

const POP_VARIANT: Record<string, "success" | "warning" | "secondary"> = {
  cao: "success", trung_bình: "warning", thấp: "secondary",
};

/** Attractions tab: grid/table of tourist attractions with CRUD. */
export function AttractionsTab({ marketId, isAdmin }: AttractionsTabProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<MarketAttraction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ["attractions", marketId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: MarketAttraction[] }>(`/markets/${marketId}/attractions`);
      return res.data.data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { images, ...rest } = form;
      const payload = { ...Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v || null])), images };
      if (editItem) {
        await apiClient.patch(`/markets/${marketId}/attractions/${editItem.id}`, payload);
      } else {
        await apiClient.post(`/markets/${marketId}/attractions`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attractions", marketId] });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/markets/${marketId}/attractions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attractions", marketId] });
      setDeleteId(null);
    },
  });

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (item: MarketAttraction) => {
    setEditItem(item);
    setForm({
      name: item.name, type: item.type ?? "", position: item.position ?? "",
      natureDescription: item.natureDescription ?? "", experienceValue: item.experienceValue ?? "",
      popularity: item.popularity ?? "", bestTime: item.bestTime ?? "",
      costInfo: item.costInfo ?? "", suitableFor: item.suitableFor ?? "",
      images: (item.images as string[]) ?? [],
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
              <TH>Tên điểm đến</TH>
              <TH>Loại</TH>
              <TH>Mức độ phổ biến</TH>
              <TH>Thời điểm tốt nhất</TH>
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
                  <p className="font-medium text-[var(--foreground)]">{item.name}</p>
                  {item.position && <p className="text-xs text-[var(--muted-foreground)]">{item.position}</p>}
                </TD>
                <TD className="text-sm text-[var(--muted-foreground)]">{item.type ?? "—"}</TD>
                <TD>
                  {item.popularity
                    ? <Badge variant={POP_VARIANT[item.popularity] ?? "secondary"}>{item.popularity}</Badge>
                    : "—"}
                </TD>
                <TD className="text-sm text-[var(--muted-foreground)]">{item.bestTime ?? "—"}</TD>
                <TD>
                  <AiVisibilityToggle
                    entityType="attraction"
                    entityId={item.id}
                    enabled={item.aiVisible}
                    invalidateKeys={[["attractions", marketId]]}
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
            <DialogTitle>{editItem ? "Chỉnh sửa điểm đến" : "Thêm điểm đến mới"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 grid-cols-2">
            <div className="col-span-2">{tf("name", "Tên điểm đến *")}</div>
            {tf("type", "Loại")}
            {tf("popularity", "Mức độ phổ biến")}
            {tf("bestTime", "Thời điểm tốt nhất")}
            {tf("costInfo", "Thông tin chi phí")}
            <div className="col-span-2">{tf("position", "Vị trí")}</div>
            <div className="col-span-2">{tf("natureDescription", "Mô tả đặc điểm", true)}</div>
            <div className="col-span-2">{tf("experienceValue", "Giá trị trải nghiệm", true)}</div>
            <div className="col-span-2">{tf("suitableFor", "Phù hợp cho", true)}</div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Hình ảnh</label>
              <ImageManager images={form.images} onChange={(imgs) => setForm((s) => ({ ...s, images: imgs }))} maxImages={8} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" disabled={saveMutation.isPending || !form.name} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Xóa điểm đến"
        description="Bạn có chắc muốn xóa điểm du lịch này không?"
        confirmLabel="Xóa"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
