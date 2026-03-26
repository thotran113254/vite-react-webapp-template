import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD, TableHeaderRow } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AiVisibilityToggle } from "@/components/market-data/ai-visibility-toggle";
import { Spinner } from "@/components/ui/spinner";
import { apiClient } from "@/lib/api-client";
import { ExperienceFormDialog } from "@/components/market-data/experience-form-dialog";
import type { MarketExperience } from "@app/shared";

interface ExperiencesTabProps {
  marketId: string;
  isAdmin: boolean;
}

/** Experiences tab: activity list with images and cost info, CRUD for admin. */
export function ExperiencesTab({ marketId, isAdmin }: ExperiencesTabProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<MarketExperience | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["experiences", marketId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: MarketExperience[] }>(
        `/markets/${marketId}/experiences`,
      );
      return res.data.data ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/markets/${marketId}/experiences/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experiences", marketId] });
      setDeleteId(null);
    },
  });

  const openAdd = () => { setEditItem(null); setDialogOpen(true); };
  const openEdit = (item: MarketExperience) => { setEditItem(item); setDialogOpen(true); };

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
              <TH>Hoạt động</TH>
              <TH>Chi phí</TH>
              <TH>Mô tả</TH>
              <TH>Hình ảnh</TH>
              <TH>AI</TH>
              {isAdmin && <TH className="w-24">Thao tác</TH>}
            </TableHeaderRow>
          </THead>
          <TBody>
            {items.length === 0 ? (
              <TR>
                <TD colSpan={isAdmin ? 6 : 5} className="py-8 text-center text-[var(--muted-foreground)]">
                  Chưa có dữ liệu
                </TD>
              </TR>
            ) : items.map((item) => (
              <TR key={item.id}>
                <TD className="font-medium">{item.activityName}</TD>
                <TD className="text-sm text-[var(--muted-foreground)] whitespace-nowrap">
                  {item.cost ?? "—"}
                </TD>
                <TD className="text-sm text-[var(--muted-foreground)] max-w-xs">
                  <p className="line-clamp-2">{item.description ?? "—"}</p>
                </TD>
                <TD>
                  {item.images && item.images.length > 0 ? (
                    <div className="flex items-center gap-1 text-sm text-[var(--muted-foreground)]">
                      <Images className="h-4 w-4" />
                      <span>{item.images.length}</span>
                    </div>
                  ) : "—"}
                </TD>
                <TD>
                  <AiVisibilityToggle
                    entityType="experience"
                    entityId={item.id}
                    enabled={item.aiVisible}
                    invalidateKeys={[["experiences", marketId]]}
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

      <ExperienceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        marketId={marketId}
        editItem={editItem}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["experiences", marketId] })}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Xóa trải nghiệm"
        description="Bạn có chắc muốn xóa hoạt động trải nghiệm này không?"
        confirmLabel="Xóa"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
