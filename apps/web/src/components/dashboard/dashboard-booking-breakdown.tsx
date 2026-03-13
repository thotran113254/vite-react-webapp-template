import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BookingBreakdownProps {
  pending: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  total: number;
}

interface BarItem {
  label: string;
  value: number;
  colorClass: string;
}

export function DashboardBookingBreakdown(props: BookingBreakdownProps) {
  const bars: BarItem[] = [
    { label: "Chờ duyệt", value: props.pending, colorClass: "bg-yellow-500" },
    { label: "Đã xác nhận", value: props.confirmed, colorClass: "bg-green-500" },
    { label: "Hoàn thành", value: props.completed, colorClass: "bg-blue-500" },
    { label: "Đã huỷ", value: props.cancelled, colorClass: "bg-red-500" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Trạng thái đặt phòng</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {bars.map((bar) => {
          const pct = props.total > 0 ? Math.round((bar.value / props.total) * 100) : 0;
          return (
            <div key={bar.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">{bar.label}</span>
                <span className="font-medium text-[var(--foreground)]">
                  {bar.value} ({pct}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                <div
                  className={`h-full rounded-full transition-all ${bar.colorClass}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
