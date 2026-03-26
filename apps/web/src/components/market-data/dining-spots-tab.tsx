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
import type { MarketDiningSpot } from "@app/shared";

interface DiningSpotsTabProps {
  marketId: string;
  isAdmin: boolean;
}

type FormState = {
  name: string;
  category: string;
  address: string;
  priceRange: string;
  priceLevel: string;
  cuisineType: string;
  operatingHours: string;
  notableFeatures: string;
};

const EMPTY_FORM: FormState = {
  name: "", category: "", address: "", priceRange: "",
  priceLevel: "", cuisineType: "", operatingHours: "", notableFeatures: "",
};

/** Dining spots tab: table list of restaurants/eateries with CRUD. */
export function DiningSpotsTab({ marketId, isAdmin }: DiningSpotsTabProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<MarketDiningSpot | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ["dining-spots", marketId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: MarketDiningSpot[] }>(`/markets/${marketId}/dining-spots`);
      return res.data.data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v || null]));
      if (editItem) {
        await apiClient.patch(`/markets/${marketId}/dining-spots/${editItem.id}`, payload);
      } else {
        await apiClient.post(`/markets/${marketId}/dining-spots`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dining-spots", marketId] });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/markets/${marketId}/dining-spots/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dining-spots", marketId] });
      setDeleteId(null);
    },
  });

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (item: MarketDiningSpot) => {
    setEditItem(item);
    setForm({
      name: item.name, category: item.category, address: item.address ?? "",
      priceRange: item.priceRange ?? "", priceLevel: item.priceLevel ?? "",
      cuisineType: item.cuisineType ?? "", operatingHours: item.operatingHours ?? "",
      notableFeatures: item.notableFeatures ?? "",
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
              <TH>Tên</TH>
              <TH>Danh mục</TH>
              <TH>Mức giá</TH>
              <TH>Loại ẩm thực</TH>
              <TH>Giờ mở cửa</TH>
              <TH>AI</TH>
              {isAdmin && <TH className="w-24">Thao tác</TH>}
            </TableHeaderRow>
          </THead>
          <TBody>
            {items.length === 0 ? (
              <TR><TD colSpan={isAdmin ? 7 : 6} className="py-8 text-center text-[var(--muted-foreground)]">Chưa có dữ liệu</TD></TR>
            ) : items.map((item) => (
              <TR key={item.id}>
                <TD>
                  <p className="font-medium text-[var(--foreground)]">{item.name}</p>
                  {item.address && <p className="text-xs text-[var(--muted-foreground)]">{item.address}</p>}
                </TD>
                <TD className="text-sm text-[var(--muted-foreground)]">{item.category}</TD>
                <TD className="text-sm text-[var(--muted-foreground)]">{item.priceRange ?? item.priceLevel ?? "—"}</TD>
                <TD className="text-sm text-[var(--muted-foreground)]">{item.cuisineType ?? "—"}</TD>
                <TD className="text-sm text-[var(--muted-foreground)]">{item.operatingHours ?? "—"}</TD>
                <TD>
                  <AiVisibilityToggle
                    entityType="dining-spot"
                    entityId={item.id}
                    enabled={item.aiVisible}
                    invalidateKeys={[["dining-spots", marketId]]}
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
            <DialogTitle>{editItem ? "Chỉnh sửa ẩm thực" : "Thêm ẩm thực mới"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 grid-cols-2">
            <div className="col-span-2">{tf("name", "Tên *")}</div>
            {tf("category", "Danh mục *")}
            {tf("cuisineType", "Loại ẩm thực")}
            {tf("priceRange", "Khoảng giá")}
            {tf("priceLevel", "Mức giá")}
            {tf("operatingHours", "Giờ mở cửa")}
            <div className="col-span-2">{tf("address", "Địa chỉ")}</div>
            <div className="col-span-2">{tf("notableFeatures", "Đặc điểm nổi bật", true)}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" disabled={saveMutation.isPending || !form.name || !form.category} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Xóa ẩm thực"
        description="Bạn có chắc muốn xóa địa điểm ăn uống này không?"
        confirmLabel="Xóa"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
