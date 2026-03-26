import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD, TableHeaderRow } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AiVisibilityToggle } from "@/components/market-data/ai-visibility-toggle";
import { Spinner } from "@/components/ui/spinner";
import { apiClient } from "@/lib/api-client";
import { KnowledgeUpdateFormDialog } from "@/components/market-data/knowledge-update-form-dialog";
import type { MarketKnowledgeUpdate } from "@app/shared";

interface KnowledgeUpdatesTabProps {
  marketId: string;
  isAdmin: boolean;
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "danger"> = {
  approved: "success",
  pending_review: "warning",
  rejected: "danger",
  draft: "secondary",
};

const STATUS_LABEL: Record<string, string> = {
  approved: "Đã duyệt",
  pending_review: "Chờ duyệt",
  rejected: "Từ chối",
  draft: "Nháp",
};

/** Knowledge updates tab: market-specific knowledge entries with workflow status. */
export function KnowledgeUpdatesTab({ marketId, isAdmin }: KnowledgeUpdatesTabProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<MarketKnowledgeUpdate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["knowledge-updates", marketId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: MarketKnowledgeUpdate[] }>(
        `/markets/${marketId}/knowledge-updates`,
      );
      return res.data.data ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/markets/${marketId}/knowledge-updates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-updates", marketId] });
      setDeleteId(null);
    },
  });

  const openAdd = () => { setEditItem(null); setDialogOpen(true); };
  const openEdit = (item: MarketKnowledgeUpdate) => { setEditItem(item); setDialogOpen(true); };

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
              <TH>Khía cạnh</TH>
              <TH>Nội dung kiến thức</TH>
              {isAdmin && <TH>Trạng thái</TH>}
              <TH>AI</TH>
              {isAdmin && <TH className="w-24">Thao tác</TH>}
            </TableHeaderRow>
          </THead>
          <TBody>
            {items.length === 0 ? (
              <TR><TD colSpan={isAdmin ? 5 : 3} className="py-8 text-center text-[var(--muted-foreground)]">Chưa có dữ liệu</TD></TR>
            ) : items.map((item) => (
              <TR key={item.id}>
                <TD className="font-medium whitespace-nowrap">{item.aspect}</TD>
                <TD className="text-sm text-[var(--muted-foreground)] max-w-md">
                  <p className="line-clamp-2">{item.knowledge}</p>
                </TD>
                {isAdmin && (
                  <TD>
                    <Badge variant={STATUS_VARIANT[item.status] ?? "secondary"}>
                      {STATUS_LABEL[item.status] ?? item.status}
                    </Badge>
                  </TD>
                )}
                <TD>
                  <AiVisibilityToggle
                    entityType="knowledge_update"
                    entityId={item.id}
                    enabled={item.aiVisible}
                    invalidateKeys={[["knowledge-updates", marketId]]}
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

      <KnowledgeUpdateFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        marketId={marketId}
        editItem={editItem}
        isAdmin={isAdmin}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["knowledge-updates", marketId] })}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Xóa kiến thức"
        description="Bạn có chắc muốn xóa mục kiến thức này không?"
        confirmLabel="Xóa"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
