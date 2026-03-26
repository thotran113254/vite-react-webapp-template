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
import type { MarketCompetitor } from "@app/shared";

interface CompetitorsTabProps {
  marketId: string;
  isAdmin: boolean;
}

type FormState = Omit<MarketCompetitor, "id" | "marketId" | "createdAt" | "updatedAt" | "aiVisible" | "sortOrder">;

const EMPTY_FORM: FormState = {
  groupName: "",
  description: null,
  examples: null,
  mainChannels: null,
  implementation: null,
  effectiveness: null,
  strengths: null,
  weaknesses: null,
  competitionDensity: null,
};

const EFFECTIVENESS_VARIANTS: Record<string, "success" | "warning" | "danger" | "secondary"> = {
  cao: "success",
  trung_bình: "warning",
  thấp: "danger",
};

/** Competitors tab: list, add, edit, delete market competitors. */
export function CompetitorsTab({ marketId, isAdmin }: CompetitorsTabProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<MarketCompetitor | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ["competitors", marketId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: MarketCompetitor[] }>(`/markets/${marketId}/competitors`);
      return res.data.data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editItem) {
        await apiClient.patch(`/markets/${marketId}/competitors/${editItem.id}`, form);
      } else {
        await apiClient.post(`/markets/${marketId}/competitors`, form);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competitors", marketId] });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/markets/${marketId}/competitors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competitors", marketId] });
      setDeleteId(null);
    },
  });

  const openAdd = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (item: MarketCompetitor) => {
    setEditItem(item);
    setForm({
      groupName: item.groupName,
      description: item.description,
      examples: item.examples,
      mainChannels: item.mainChannels,
      implementation: item.implementation,
      effectiveness: item.effectiveness,
      strengths: item.strengths,
      weaknesses: item.weaknesses,
      competitionDensity: item.competitionDensity,
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
              <TH>Nhóm đối thủ</TH>
              <TH>Ví dụ</TH>
              <TH>Kênh chính</TH>
              <TH>Hiệu quả</TH>
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
                  <p className="font-medium text-[var(--foreground)]">{item.groupName}</p>
                  {item.description && <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{item.description}</p>}
                </TD>
                <TD className="text-sm text-[var(--muted-foreground)]">{item.examples ?? "—"}</TD>
                <TD className="text-sm text-[var(--muted-foreground)]">{item.mainChannels ?? "—"}</TD>
                <TD>
                  {item.effectiveness ? (
                    <Badge variant={EFFECTIVENESS_VARIANTS[item.effectiveness] ?? "secondary"}>
                      {item.effectiveness}
                    </Badge>
                  ) : "—"}
                </TD>
                <TD>
                  <AiVisibilityToggle
                    entityType="competitor"
                    entityId={item.id}
                    enabled={item.aiVisible}
                    invalidateKeys={[["competitors", marketId]]}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editItem ? "Chỉnh sửa đối thủ" : "Thêm đối thủ mới"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 grid-cols-2">
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium">Tên nhóm đối thủ *</label>
              <Input value={form.groupName} onChange={(e) => setForm((f) => ({ ...f, groupName: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Ví dụ</label>
              <Input value={form.examples ?? ""} onChange={(e) => setForm((f) => ({ ...f, examples: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Kênh chính</label>
              <Input value={form.mainChannels ?? ""} onChange={(e) => setForm((f) => ({ ...f, mainChannels: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Hiệu quả</label>
              <Input value={form.effectiveness ?? ""} onChange={(e) => setForm((f) => ({ ...f, effectiveness: e.target.value }))} placeholder="cao / trung_bình / thấp" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Mật độ cạnh tranh</label>
              <Input value={form.competitionDensity ?? ""} onChange={(e) => setForm((f) => ({ ...f, competitionDensity: e.target.value }))} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium">Điểm mạnh</label>
              <Textarea rows={2} value={form.strengths ?? ""} onChange={(e) => setForm((f) => ({ ...f, strengths: e.target.value }))} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium">Điểm yếu</label>
              <Textarea rows={2} value={form.weaknesses ?? ""} onChange={(e) => setForm((f) => ({ ...f, weaknesses: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" disabled={saveMutation.isPending || !form.groupName} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Xóa đối thủ"
        description="Bạn có chắc muốn xóa nhóm đối thủ này không?"
        confirmLabel="Xóa"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
