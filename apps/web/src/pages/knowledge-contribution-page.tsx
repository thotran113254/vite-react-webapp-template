import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD, TableHeaderRow } from "@/components/ui/data-table";
import { Spinner } from "@/components/ui/spinner";
import { apiClient } from "@/lib/api-client";
import type { Market, MarketKnowledgeUpdate } from "@app/shared";

/** Suggested aspects — users can type any value freely. */
const ASPECT_SUGGESTIONS = [
  "Văn hóa", "Khí hậu", "Giao thông", "An ninh",
  "Dịch vụ", "Giá cả", "Mua sắm", "Ẩm thực",
  "Lưu trú", "Hoạt động", "Khác",
];

const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "danger"> = {
  approved: "success", pending_review: "warning", rejected: "danger", draft: "secondary",
};
const STATUS_LABEL: Record<string, string> = {
  approved: "Đã duyệt", pending_review: "Chờ duyệt", rejected: "Từ chối", draft: "Nháp",
};

type FormState = { marketId: string; aspect: string; knowledge: string };
const EMPTY: FormState = { marketId: "", aspect: "", knowledge: "" };

/** Staff page: submit knowledge contributions + view own submission history. */
export default function KnowledgeContributionPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: markets, isLoading: marketsLoading } = useQuery({
    queryKey: ["markets-list"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Market[] }>("/markets?limit=100");
      return res.data.data ?? [];
    },
  });

  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ["my-submissions"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: MarketKnowledgeUpdate[] }>("/knowledge-reviews/mine");
      return res.data.data ?? [];
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/markets/${form.marketId}/knowledge-updates`, {
        aspect: form.aspect,
        knowledge: form.knowledge,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
      setForm(EMPTY);
    },
  });

  const filtered = (submissions ?? []).filter(
    (s) => filterStatus === "all" || s.status === filterStatus,
  );

  const isValid = form.marketId && form.aspect && form.knowledge.trim();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookPlus className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Đóng góp kiến thức</h1>
      </div>

      {/* Submit form */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
        <h2 className="text-lg font-semibold">Gửi kiến thức mới</h2>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Thị trường *</label>
          {marketsLoading ? <Spinner /> : (
            <select
              className="flex h-9 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1 text-sm"
              value={form.marketId}
              onChange={(e) => setForm((s) => ({ ...s, marketId: e.target.value }))}
            >
              <option value="">-- Chọn thị trường --</option>
              {(markets ?? []).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Khía cạnh *</label>
          <Input
            list="aspect-suggestions-contrib"
            placeholder="Nhập hoặc chọn khía cạnh..."
            value={form.aspect}
            onChange={(e) => setForm((s) => ({ ...s, aspect: e.target.value }))}
          />
          <datalist id="aspect-suggestions-contrib">
            {ASPECT_SUGGESTIONS.map((a) => <option key={a} value={a} />)}
          </datalist>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Nội dung kiến thức *</label>
          <Textarea
            rows={4}
            placeholder="Chia sẻ kiến thức của bạn về thị trường này..."
            value={form.knowledge}
            onChange={(e) => setForm((s) => ({ ...s, knowledge: e.target.value }))}
          />
        </div>

        <div className="flex justify-end">
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            disabled={submitMutation.isPending || !isValid}
            onClick={() => submitMutation.mutate()}
          >
            {submitMutation.isPending ? "Đang gửi..." : "Gửi đóng góp"}
          </Button>
        </div>
      </div>

      {/* Submission history */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Lịch sử đóng góp</h2>
          <select
            className="h-8 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Tất cả</option>
            <option value="pending_review">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Từ chối</option>
          </select>
        </div>

        {submissionsLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : (
          <Table>
            <THead>
              <TableHeaderRow>
                <TH>Thị trường</TH>
                <TH>Khía cạnh</TH>
                <TH>Nội dung</TH>
                <TH>Trạng thái</TH>
                <TH>Ngày gửi</TH>
              </TableHeaderRow>
            </THead>
            <TBody>
              {filtered.length === 0 ? (
                <TR><TD colSpan={5} className="py-8 text-center text-[var(--muted-foreground)]">Chưa có đóng góp nào</TD></TR>
              ) : filtered.map((s) => (
                <TR key={s.id}>
                  <TD className="text-sm font-medium">{(s as unknown as { marketName?: string }).marketName ?? s.marketId}</TD>
                  <TD className="text-sm">{s.aspect}</TD>
                  <TD className="text-sm text-[var(--muted-foreground)] max-w-xs">
                    <p className="line-clamp-2">{s.knowledge}</p>
                    {s.reviewNotes && s.status === "rejected" && (
                      <p className="text-xs text-red-500 mt-1">Lý do: {s.reviewNotes}</p>
                    )}
                  </TD>
                  <TD>
                    <Badge variant={STATUS_VARIANT[s.status] ?? "secondary"}>
                      {STATUS_LABEL[s.status] ?? s.status}
                    </Badge>
                  </TD>
                  <TD className="text-sm text-[var(--muted-foreground)]">
                    {new Date(s.createdAt).toLocaleDateString("vi-VN")}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>
    </div>
  );
}
