import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Table, THead, TBody, TR, TH, TD, TableHeaderRow } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";

type Period = "7d" | "30d" | "90d" | "all";

interface StaffUsageEntry {
  userId: string;
  userName: string;
  userEmail: string;
  totalSessions: number;
  totalMessages: number;
  estimatedMinutes: number;
  lastActive: string | null;
}

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: "7 ngày", value: "7d" },
  { label: "30 ngày", value: "30d" },
  { label: "90 ngày", value: "90d" },
  { label: "Tất cả", value: "all" },
];

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins} phút`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}g ${m}p` : `${h} giờ`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

async function fetchUsage(period: Period): Promise<StaffUsageEntry[]> {
  const res = await apiClient.get(`/admin/analytics/usage?period=${period}`);
  return res.data.data as StaffUsageEntry[];
}

/** Admin staff usage tab — per-staff session/message/time metrics */
export function StaffUsageTab() {
  const [period, setPeriod] = useState<Period>("30d");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-usage", period],
    queryFn: () => fetchUsage(period),
  });

  const maxMessages = Math.max(...(data?.map((d) => d.totalMessages) ?? [1]), 1);

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
              <TH>#</TH>
              <TH>Nhân viên</TH>
              <TH className="w-24 text-right">Phiên chat</TH>
              <TH className="w-32 text-right">Tin nhắn</TH>
              <TH className="w-32 text-right">Thời gian (ước tính)</TH>
              <TH className="w-32 text-right">Hoạt động cuối</TH>
            </TableHeaderRow>
          </THead>
          <TBody>
            {data.map((entry, i) => {
              const isTop = i === 0;
              return (
                <TR key={entry.userId} className={isTop ? "bg-teal-50/40 dark:bg-teal-900/10" : undefined}>
                  <TD className="text-[var(--muted-foreground)]">{i + 1}</TD>
                  <TD>
                    <p className="font-medium">{entry.userName}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{entry.userEmail}</p>
                  </TD>
                  <TD className="text-right">{entry.totalSessions}</TD>
                  <TD className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div
                        className="h-1.5 rounded-full bg-teal-500"
                        style={{ width: `${Math.round((entry.totalMessages / maxMessages) * 60)}px` }}
                      />
                      <span>{entry.totalMessages}</span>
                    </div>
                  </TD>
                  <TD className="text-right">{formatMinutes(entry.estimatedMinutes)}</TD>
                  <TD className="text-right text-sm text-[var(--muted-foreground)]">
                    {formatDate(entry.lastActive)}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
      <p className="text-xs text-[var(--muted-foreground)]">
        * Thời gian ước tính, tối đa 120 phút/phiên để tránh sai lệch do tab mở lâu.
      </p>
    </div>
  );
}
