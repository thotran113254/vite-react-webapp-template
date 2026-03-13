import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Trash2, Play, Square, Archive, RotateCw, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ResourceStatusBadge } from "@/components/resource/resource-status-badge";
import { ResourceEditModal } from "@/components/resource/resource-edit-modal";
import { apiClient } from "@/lib/api-client";
import type { Resource, ApiResponse } from "@app/shared";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 text-sm">
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span className="font-medium text-[var(--foreground)]">{value}</span>
    </div>
  );
}

const ACTION_STATUS: Record<string, Resource["status"]> = {
  activate: "active",
  deactivate: "inactive",
};

/** Detailed resource view with modal edit & confirm delete. */
export default function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: resource, isLoading, isError } = useQuery({
    queryKey: ["resource", id],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Resource>>(`/resources/${id}`);
      return res.data.data!;
    },
    enabled: !!id,
  });

  const actionMutation = useMutation({
    mutationFn: async (action: string) => {
      await apiClient.post(`/resources/${id}/action`, { action });
    },
    onMutate: async (action) => {
      await queryClient.cancelQueries({ queryKey: ["resource", id] });
      const previous = queryClient.getQueryData<Resource>(["resource", id]);
      if (ACTION_STATUS[action] && previous) {
        queryClient.setQueryData<Resource>(["resource", id], {
          ...previous,
          status: ACTION_STATUS[action],
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["resource", id], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["resource", id] });
      queryClient.invalidateQueries({ queryKey: ["resource-list"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => { await apiClient.delete(`/resources/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-list"] });
      navigate("/resources");
    },
  });

  if (isLoading) return <PageSpinner />;
  if (isError || !resource)
    return <p className="text-red-600">Không tìm thấy tài nguyên hoặc tải thất bại.</p>;

  const metadataEntries = Object.entries(resource.metadata ?? {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/resources"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-[var(--accent)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--foreground)]">{resource.name}</h1>
            <ResourceStatusBadge status={resource.status} />
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">{resource.description}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </Button>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {[
          { action: "activate", icon: Play, label: "Kích hoạt", disabled: resource.status === "active" },
          { action: "deactivate", icon: Square, label: "Vô hiệu hóa", disabled: resource.status === "inactive" },
          { action: "archive", icon: Archive, label: "Lưu trữ" },
          { action: "restore", icon: RotateCw, label: "Khôi phục" },
        ].map(({ action, icon: Icon, label, disabled }) => (
          <Button
            key={action}
            variant="outline"
            size="sm"
            disabled={actionMutation.isPending || disabled}
            onClick={() => actionMutation.mutate(action)}
          >
            <Icon className="mr-2 h-4 w-4" /> {label}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Thông tin tài nguyên</CardTitle></CardHeader>
          <CardContent className="divide-y divide-[var(--border)]">
            <InfoRow label="Đường dẫn" value={resource.slug} />
            <InfoRow label="Danh mục" value={resource.category} />
            <InfoRow label="Trạng thái" value={resource.status} />
            <InfoRow label="Ngày tạo" value={new Date(resource.createdAt).toLocaleDateString()} />
            <InfoRow label="Cập nhật" value={new Date(resource.updatedAt).toLocaleDateString()} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Dữ liệu bổ sung</CardTitle></CardHeader>
          <CardContent className="divide-y divide-[var(--border)]">
            {metadataEntries.length > 0 ? (
              metadataEntries.map(([key, value]) => (
                <InfoRow key={key} label={key} value={String(value)} />
              ))
            ) : (
              <p className="py-4 text-sm text-[var(--muted-foreground)]">Không có dữ liệu bổ sung.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <ResourceEditModal open={editOpen} onOpenChange={setEditOpen} resource={resource} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Xóa tài nguyên"
        description={`Delete "${resource.name}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
