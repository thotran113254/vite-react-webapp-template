import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD, TableHeaderRow } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { apiClient } from "@/lib/api-client";
import type { MarketKnowledgeUpdate } from "@app/shared";

type ReviewEntry = MarketKnowledgeUpdate & { marketName?: string };
type ReviewAction = { id: string; action: "approve" | "reject" } | null;

const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "danger"> = {
  approved: "success", pending_review: "warning", rejected: "danger", draft: "secondary",
};
const STATUS_LABEL: Record<string, string> = {
  approved: "Đã duyệt", pending_review: "Chờ duyệt", rejected: "Từ chối", draft: "Nháp",
};

/** Admin page: review pending knowledge contributions — approve or reject with notes. */
export default function KnowledgeReviewPage() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("pending_review");
  const [reviewAction, setReviewAction] = useState<ReviewAction>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["knowledge-reviews", filterStatus],
    queryFn: async () => {
      const status = filterStatus !== "all" ? `?status=${filterStatus}` : "";
      const res = await apiClient.get<{ data: ReviewEntry[] }>(`/knowledge-reviews${status}`);
      return res.data.data ?? [];
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" }) => {
      await apiClient.patch(`/knowledge-reviews/${id}/${action}`, { reviewNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-reviews"] });
      setReviewAction(null);
      setReviewNotes("");
    },
  });

  const openReview = (id: string, action: "approve" | "reject") => {
    setReviewAction({ id, action });
    setReviewNotes("");
  };

  const items = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Duyệt kiến thức</h1>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-[var(--muted-foreground)]">Trạng thái:</label>
        <select
          className="h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="pending_review">Chờ duyệt</option>
          <option value="approved">Đã duyệt</option>
          <option value="rejected">Từ chối</option>
          <option value="all">Tất cả</option>
        </select>
        {!isLoading && (
          <span className="text-sm text-[var(--muted-foreground)]">{items.length} mục</span>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <Table>
          <THead>
            <TableHeaderRow>
              <TH>Thị trường</TH>
              <TH>Khía cạnh</TH>
              <TH>Nội dung</TH>
              <TH>Trạng thái</TH>
              <TH>Ngày gửi</TH>
              {filterStatus === "pending_review" && <TH className="w-32">Thao tác</TH>}
            </TableHeaderRow>
          </THead>
          <TBody>
            {items.length === 0 ? (
              <TR>
                <TD colSpan={filterStatus === "pending_review" ? 6 : 5} className="py-8 text-center text-[var(--muted-foreground)]">
                  Không có dữ liệu
                </TD>
              </TR>
            ) : items.map((item) => (
              <TR key={item.id}>
                <TD className="text-sm font-medium whitespace-nowrap">{item.marketName ?? item.marketId}</TD>
                <TD className="text-sm whitespace-nowrap">{item.aspect}</TD>
                <TD className="text-sm text-[var(--muted-foreground)] max-w-sm">
                  <p className="line-clamp-3">{item.knowledge}</p>
                  {item.reviewNotes && (
                    <p className="text-xs text-[var(--muted-foreground)] mt-1 italic">Ghi chú: {item.reviewNotes}</p>
                  )}
                </TD>
                <TD>
                  <Badge variant={STATUS_VARIANT[item.status] ?? "secondary"}>
                    {STATUS_LABEL[item.status] ?? item.status}
                  </Badge>
                </TD>
                <TD className="text-sm text-[var(--muted-foreground)] whitespace-nowrap">
                  {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                </TD>
                {filterStatus === "pending_review" && (
                  <TD>
                    <div className="flex gap-1">
                      <Button
                        size="icon" variant="ghost"
                        className="text-green-600 hover:text-green-700"
                        title="Duyệt"
                        onClick={() => openReview(item.id, "approve")}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        className="text-red-500 hover:text-red-700"
                        title="Từ chối"
                        onClick={() => openReview(item.id, "reject")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TD>
                )}
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {/* Approve/Reject dialog */}
      <Dialog open={!!reviewAction} onOpenChange={(o) => !o && setReviewAction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewAction?.action === "approve" ? "Duyệt kiến thức" : "Từ chối kiến thức"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-[var(--muted-foreground)]">
              {reviewAction?.action === "approve"
                ? "Mục này sẽ được phê duyệt và hiển thị trong tab kiến thức thị trường."
                : "Mục này sẽ bị từ chối. Vui lòng nhập lý do (tùy chọn)."}
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Ghi chú {reviewAction?.action === "reject" ? "(lý do từ chối)" : "(tùy chọn)"}</label>
              <Textarea
                rows={3}
                placeholder="Nhập ghi chú..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewAction(null)}>Hủy</Button>
            <Button
              className={reviewAction?.action === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
              disabled={reviewMutation.isPending}
              onClick={() => reviewAction && reviewMutation.mutate(reviewAction)}
            >
              {reviewMutation.isPending ? "Đang xử lý..." : reviewAction?.action === "approve" ? "Duyệt" : "Từ chối"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
