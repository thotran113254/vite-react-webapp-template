import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RecentBooking {
  id: string;
  hotelName: string;
  status: string;
  totalPrice: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  createdAt: string;
}

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "danger" | "secondary"> = {
  pending: "warning",
  confirmed: "success",
  cancelled: "danger",
  completed: "default",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ duyệt",
  confirmed: "Đã xác nhận",
  cancelled: "Đã huỷ",
  completed: "Hoàn thành",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

export function DashboardRecentBookings({ bookings }: { bookings: RecentBooking[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Đặt phòng gần đây</CardTitle>
        <Link
          to="/hotels"
          className="inline-flex items-center text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400"
        >
          Xem tất cả <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">Chưa có đặt phòng nào.</p>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[var(--foreground)]">{b.hotelName}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {formatDate(b.checkIn)} - {formatDate(b.checkOut)} | {b.guests} khách
                  </p>
                </div>
                <div className="ml-4 flex items-center gap-3">
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    {formatCurrency(b.totalPrice)}
                  </span>
                  <Badge variant={STATUS_VARIANT[b.status] ?? "secondary"}>
                    {STATUS_LABEL[b.status] ?? b.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
