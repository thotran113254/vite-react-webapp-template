import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Table, THead, TBody, TR, TH, TD, TableHeaderRow } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Period = "7d" | "30d" | "90d" | "all";

interface FaqEntry {
  question: string;
  count: number;
  category: string;
  examples: string[];
}

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: "7 ngày", value: "7d" },
  { label: "30 ngày", value: "30d" },
  { label: "90 ngày", value: "90d" },
  { label: "Tất cả", value: "all" },
];

async function fetchFaq(period: Period): Promise<FaqEntry[]> {
  const res = await apiClient.get(`/admin/analytics/faq?period=${period}`);
  return res.data.data as FaqEntry[];
}

/** Admin FAQ analytics tab — shows top questions grouped by category */
export function FaqAnalyticsTab() {
  const [period, setPeriod] = useState<Period>("30d");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-faq", period],
    queryFn: () => fetchFaq(period),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--muted-foreground)]">Khoảng thời gian:</span>
        {PERIOD_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            size="sm"
            variant={period === opt.value ? "default" : "outline"}
            onClick={() => setPeriod(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-[var(--muted-foreground)]">
          Đang tải...
        </div>
      ) : !data?.length ? (
        <div className="flex h-40 items-center justify-center text-[var(--muted-foreground)]">
          Chưa có dữ liệu trong khoảng thời gian này.
        </div>
      ) : (
        <Table>
          <THead>
            <TableHeaderRow>
              <TH className="w-8">#</TH>
              <TH>Câu hỏi đại diện</TH>
              <TH>Danh mục</TH>
              <TH className="w-24 text-right">Số lần</TH>
            </TableHeaderRow>
          </THead>
          <TBody>
            {data.map((entry, i) => (
              <TR key={i}>
                <TD className="font-medium text-[var(--muted-foreground)]">{i + 1}</TD>
                <TD>
                  <p className="font-medium">{entry.question}</p>
                  {entry.examples.length > 0 && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-[var(--muted-foreground)]">
                      Ví dụ: {entry.examples[0]}
                    </p>
                  )}
                </TD>
                <TD>
                  <Badge variant="secondary">{entry.category}</Badge>
                </TD>
                <TD className="text-right font-semibold">{entry.count}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
