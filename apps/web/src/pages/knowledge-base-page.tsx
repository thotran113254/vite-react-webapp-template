import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, TableHeaderRow } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageSpinner } from "@/components/ui/spinner";
import { KbArticleModal } from "@/components/knowledge-base/kb-article-modal";
import { useDeleteMutation } from "@/hooks/use-optimistic-mutation";
import { useConfirmAction } from "@/hooks/use-confirm-action";
import { apiClient } from "@/lib/api-client";
import type { KbArticle, PaginatedResponse } from "@app/shared";

type StatusFilter = "all" | "published" | "draft";

const STATUS_BADGE: Record<string, { label: string; variant: "success" | "secondary" | "warning" }> = {
  published: { label: "Hoạt động", variant: "success" },
  draft: { label: "Bản nháp", variant: "secondary" },
  archived: { label: "Lưu trữ", variant: "warning" },
};

const CATEGORY_COLORS: Record<string, string> = {
  FAQ: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "Chính sách": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "Hướng dẫn": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "Điểm đến": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "Dịch vụ": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

/** Admin knowledge base management page with CRUD and filters. */
export default function KnowledgeBasePage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editArticle, setEditArticle] = useState<KbArticle | undefined>();
  const deleteConfirm = useConfirmAction<KbArticle>();

  const queryKey = ["kb-articles", page, search, statusFilter] as const;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await apiClient.get<PaginatedResponse<KbArticle>>(`/knowledge-base?${params}`);
      return { items: res.data.data ?? [], meta: res.data.meta };
    },
  });

  const deleteMutation = useDeleteMutation<KbArticle>({
    queryKey,
    endpoint: (id) => `/knowledge-base/${id}`,
    onSuccess: () => deleteConfirm.cancel(),
  });

  const articles = data?.items ?? [];
  const meta = data?.meta;
  const total = meta?.total ?? 0;
  const activeCount = articles.filter((a) => a.status === "published").length;

  const handleAddNew = () => { setEditArticle(undefined); setModalOpen(true); };
  const handleEdit = (a: KbArticle) => { setEditArticle(a); setModalOpen(true); };

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Quản lý FAQ</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Quản lý cơ sở tri thức AI</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Cập nhật AI
          </Button>
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" /> Thêm mới
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Tổng câu hỏi", value: total, color: "text-blue-600" },
          { label: "Đang hoạt động", value: activeCount, color: "text-green-600" },
          { label: "Bản nháp", value: total - activeCount, color: "text-gray-600" },
          { label: "Cần cập nhật", value: 0, color: "text-orange-600" },
        ].map((s) => (
          <Card key={s.label}><CardContent className="pt-4 pb-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {(["all", "published", "draft"] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => { setStatusFilter(f); setPage(1); }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === f
                  ? "bg-blue-600 text-white"
                  : "bg-[var(--muted)]/40 text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              }`}
            >
              {f === "all" ? "Tất cả" : f === "published" ? "Đang hoạt động" : "Bản nháp"}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            className="pl-9"
            placeholder="Tìm kiếm..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {isError && <p className="text-sm text-red-600">Không thể tải dữ liệu.</p>}

      <Table>
        <THead>
          <TableHeaderRow>
            <TH>ID</TH>
            <TH>Danh mục</TH>
            <TH>Nội dung / Câu hỏi</TH>
            <TH className="hidden md:table-cell">Cập nhật lần cuối</TH>
            <TH>Trạng thái</TH>
            <TH className="text-right">Thao tác</TH>
          </TableHeaderRow>
        </THead>
        <TBody>
          {articles.length === 0 ? (
            <TR>
              <TD colSpan={6} className="text-center text-[var(--muted-foreground)] py-8">
                Không có dữ liệu.
              </TD>
            </TR>
          ) : articles.map((article) => {
            const si = STATUS_BADGE[article.status] ?? STATUS_BADGE["draft"]!;
            const cc = CATEGORY_COLORS[article.category] ?? "bg-gray-100 text-gray-700";
            return (
              <TR key={article.id}>
                <TD className="text-xs text-[var(--muted-foreground)] font-mono">{article.id.slice(0, 8)}</TD>
                <TD><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cc}`}>{article.category}</span></TD>
                <TD>
                  <p className="font-medium text-[var(--foreground)] line-clamp-1">{article.title}</p>
                  {article.content && <p className="text-xs text-[var(--muted-foreground)] line-clamp-1 mt-0.5">{article.content}</p>}
                </TD>
                <TD className="hidden text-[var(--muted-foreground)] text-sm md:table-cell">{new Date(article.updatedAt).toLocaleDateString("vi-VN")}</TD>
                <TD><Badge variant={si.variant}>{si.label}</Badge></TD>
                <TD className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(article)}>Sửa</Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteConfirm.requestConfirm(article)}>Xóa</Button>
                  </div>
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>

      {meta && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--muted-foreground)]">
            Hiển thị {(page - 1) * 10 + 1}-{Math.min(page * 10, total)} trên {total} kết quả
          </p>
          <Pagination page={page} totalPages={meta.totalPages} total={total} onPageChange={setPage} />
        </div>
      )}

      <KbArticleModal open={modalOpen} onOpenChange={setModalOpen} article={editArticle} onSuccess={() => refetch()} />
      <ConfirmDialog
        open={deleteConfirm.open} onOpenChange={(v) => { if (!v) deleteConfirm.cancel(); }}
        title="Xóa bài viết" description={`Bạn có chắc muốn xóa "${deleteConfirm.item?.title}"?`}
        confirmLabel="Xóa" variant="destructive" isLoading={deleteMutation.isPending}
        onConfirm={() => deleteConfirm.confirm((a) => deleteMutation.mutate(a.id))}
      />
    </div>
  );
}
