import { Star, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TopHotel {
  id: string;
  name: string;
  location: string;
  starRating: number;
  bookingCount: number;
}

export function DashboardTopHotels({ hotels }: { hotels: TopHotel[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Khách sạn phổ biến</CardTitle>
      </CardHeader>
      <CardContent>
        {hotels.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">Chưa có dữ liệu.</p>
        ) : (
          <div className="space-y-3">
            {hotels.map((h, idx) => (
              <div
                key={h.id}
                className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700 dark:bg-teal-900 dark:text-teal-300">
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[var(--foreground)]">{h.name}</p>
                  <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {h.location}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> {h.starRating}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{h.bookingCount}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">đặt phòng</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
