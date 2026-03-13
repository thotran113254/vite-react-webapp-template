import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Play, Square, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Table, THead, TBody, TR, TH, TD, TableHeaderRow } from "@/components/ui/data-table";
import { ResourceStatusBadge } from "@/components/resource/resource-status-badge";
import { ResourceCreateModal } from "@/components/resource/resource-create-modal";
import { ResourceEditModal } from "@/components/resource/resource-edit-modal";
import { ResourceFilters, type ResourceFilterValues } from "@/components/resource/resource-filters";
import { Pagination } from "@/components/ui/pagination";
import { useDeleteMutation, useActionMutation } from "@/hooks/use-optimistic-mutation";
import { useConfirmAction } from "@/hooks/use-confirm-action";
import { apiClient } from "@/lib/api-client";
import type { Resource, PaginatedResponse } from "@app/shared";

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-lg font-medium text-[var(--foreground)]">Chưa có tài nguyên</p>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        Tạo tài nguyên đầu tiên để bắt đầu.
      </p>
      <Button className="mt-4" onClick={onCreate}>
        <Plus className="mr-2 h-4 w-4" />
        Tạo tài nguyên
      </Button>
    </div>
  );
}

/** Table listing of all resources with search, filters, and modal-based CRUD. */
export default function ResourceListPage() {
  const navigate = useNavigate();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const deleteConfirm = useConfirmAction<Resource>();

  const [filters, setFilters] = useState<ResourceFilterValues>({
    search: "",
    status: "",
    category: "",
  });
  const [page, setPage] = useState(1);

  const handleFiltersChange = (newFilters: ResourceFilterValues) => {
    setFilters(newFilters);
    setPage(1);
  };

  const queryKey = ["resource-list", filters, page];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (filters.search) params.set("search", filters.search);
      if (filters.status) params.set("status", filters.status);
      if (filters.category) params.set("category", filters.category);
      const res = await apiClient.get<PaginatedResponse<Resource>>(`/resources?${params}`);
      return { items: res.data.data ?? [], meta: res.data.meta };
    },
  });

  const actionMutation = useActionMutation<Resource>({
    queryKey,
    endpoint: (id) => `/resources/${id}/action`,
    optimisticFieldMap: {
      activate: { status: "active" } as Partial<Resource>,
      deactivate: { status: "inactive" } as Partial<Resource>,
    },
  });

  const deleteMutation = useDeleteMutation<Resource>({
    queryKey,
    endpoint: (id) => `/resources/${id}`,
    onSuccess: () => deleteConfirm.cancel(),
  });

  if (isLoading) return <PageSpinner />;
  const items = data?.items ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Tài nguyên</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Tìm thấy {total} tài nguyên
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo tài nguyên
        </Button>
      </div>

      <ResourceFilters filters={filters} onChange={handleFiltersChange} />

      {isError && <p className="text-sm text-red-600">Không thể tải tài nguyên.</p>}

      {items.length === 0 ? (
        <EmptyState onCreate={() => setCreateOpen(true)} />
      ) : (
        <Table>
          <THead>
            <TableHeaderRow>
              <TH>Tên</TH>
              <TH>Danh mục</TH>
              <TH>Trạng thái</TH>
              <TH className="hidden md:table-cell">Mô tả</TH>
              <TH className="text-right">Thao tác</TH>
            </TableHeaderRow>
          </THead>
          <TBody>
            {items.map((item) => (
              <TR
                key={item.id}
                className="cursor-pointer transition-colors hover:bg-[var(--muted)]/30"
                onClick={() => navigate(`/resources/${item.id}`)}
              >
                <TD className="font-medium text-[var(--foreground)]">{item.name}</TD>
                <TD className="text-[var(--muted-foreground)]">{item.category}</TD>
                <TD><ResourceStatusBadge status={item.status} /></TD>
                <TD className="hidden max-w-xs truncate text-[var(--muted-foreground)] md:table-cell">
                  {item.description}
                </TD>
                <TD className="text-right">
                  <div
                    className="flex items-center justify-end gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.status === "inactive" && (
                      <Button
                        size="sm" variant="outline" title="Kích hoạt"
                        disabled={actionMutation.isPending}
                        onClick={() => actionMutation.mutate({ id: item.id, action: "activate" })}
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                    )}
                    {item.status === "active" && (
                      <Button
                        size="sm" variant="outline" title="Vô hiệu hóa"
                        disabled={actionMutation.isPending}
                        onClick={() => actionMutation.mutate({ id: item.id, action: "deactivate" })}
                      >
                        <Square className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      size="sm" variant="ghost" title="Sửa"
                      onClick={() => { setEditingResource(item); setEditOpen(true); }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm" variant="ghost" title="Xóa"
                      className="text-[var(--destructive)] hover:text-[var(--destructive)]"
                      onClick={() => deleteConfirm.requestConfirm(item)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {data?.meta && (
        <Pagination
          page={page}
          totalPages={data.meta.totalPages}
          total={data.meta.total}
          onPageChange={setPage}
        />
      )}

      <ResourceCreateModal open={createOpen} onOpenChange={setCreateOpen} />
      <ResourceEditModal open={editOpen} onOpenChange={setEditOpen} resource={editingResource} />
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(v) => { if (!v) deleteConfirm.cancel(); }}
        title="Xóa tài nguyên"
        description={`Delete "${deleteConfirm.item?.name}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteConfirm.confirm((item) => deleteMutation.mutate(item.id))}
      />
    </div>
  );
}
