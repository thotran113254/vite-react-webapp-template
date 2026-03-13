import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Pagination } from "@/components/ui/pagination";
import { Table, THead, TBody, TR, TH, TD, TableHeaderRow } from "@/components/ui/data-table";
import { useAuth } from "@/hooks/use-auth";
import { useDeleteMutation } from "@/hooks/use-optimistic-mutation";
import { useConfirmAction } from "@/hooks/use-confirm-action";
import { apiClient } from "@/lib/api-client";
import type { User, PaginatedResponse } from "@app/shared";

/** Admin-only page listing all users with pagination and confirm-dialog delete. */
export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const deleteConfirm = useConfirmAction<User>();
  const [page, setPage] = useState(1);

  const queryKey = ["users-list", page];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<User>>(`/users?page=${page}&limit=20`);
      return { items: res.data.data ?? [], meta: res.data.meta };
    },
  });

  const deleteMutation = useDeleteMutation<User>({
    queryKey,
    endpoint: (id) => `/users/${id}`,
    onSuccess: () => deleteConfirm.cancel(),
  });

  if (isLoading) return <PageSpinner />;
  const users = data?.items ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Người dùng</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {total} người dùng đã đăng ký
        </p>
      </div>

      {isError && (
        <p className="text-sm text-red-600">Không thể tải người dùng. Cần quyền quản trị.</p>
      )}

      {users.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">Không tìm thấy người dùng.</p>
      ) : (
        <Table>
          <THead>
            <TableHeaderRow>
              <TH>Tên</TH>
              <TH>Email</TH>
              <TH>Vai trò</TH>
              <TH className="hidden sm:table-cell">Ngày tham gia</TH>
              <TH className="text-right">Thao tác</TH>
            </TableHeaderRow>
          </THead>
          <TBody>
            {users.map((user) => {
              const isSelf = user.id === currentUser?.id;
              return (
                <TR key={user.id}>
                  <TD className="font-medium text-[var(--foreground)]">
                    {user.name}
                    {isSelf && (
                      <span className="ml-2 text-xs text-[var(--muted-foreground)]">(bạn)</span>
                    )}
                  </TD>
                  <TD className="text-[var(--muted-foreground)]">{user.email}</TD>
                  <TD>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      {user.role}
                    </Badge>
                  </TD>
                  <TD className="hidden text-[var(--muted-foreground)] sm:table-cell">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TD>
                  <TD className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isSelf || deleteMutation.isPending}
                      title={isSelf ? "Không thể xóa tài khoản của bạn" : `Delete ${user.name}`}
                      onClick={() => deleteConfirm.requestConfirm(user)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TD>
                </TR>
              );
            })}
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

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(v) => { if (!v) deleteConfirm.cancel(); }}
        title="Xóa người dùng"
        description={`Xóa người dùng "${deleteConfirm.item?.name}" (${deleteConfirm.item?.email})? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteConfirm.confirm((user) => deleteMutation.mutate(user.id))}
      />
    </div>
  );
}
