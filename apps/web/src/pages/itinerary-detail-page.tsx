import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { Download, Share2, MessageCircle, CalendarDays, Users, ChevronRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageSpinner } from "@/components/ui/spinner";
import { ItineraryDaySection } from "@/components/itinerary/itinerary-day-section";
import { apiClient } from "@/lib/api-client";
import type { ApiResponse, Trip, ItineraryItem, TripStatus } from "@app/shared";

// --- helpers ---

const STATUS_LABEL: Record<TripStatus, string> = {
  draft:     "NHÁP",
  active:    "CHUYẾN ĐI ĐANG DIỄN RA",
  completed: "ĐÃ HOÀN THÀNH",
  cancelled: "ĐÃ HỦY",
};

const STATUS_COLOR: Record<TripStatus, string> = {
  draft:     "bg-gray-100 text-gray-700 border-gray-300",
  active:    "bg-teal-50 text-teal-700 border-teal-300",
  completed: "bg-blue-50 text-blue-700 border-blue-300",
  cancelled: "bg-red-50 text-red-700 border-red-300",
};

function formatDateRange(start: string, end: string): string {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("vi-VN", { day: "numeric", month: "short", year: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function groupByDay(items: ItineraryItem[]): Map<number, ItineraryItem[]> {
  const map = new Map<number, ItineraryItem[]>();
  for (const item of items) {
    const list = map.get(item.dayNumber) ?? [];
    list.push(item);
    map.set(item.dayNumber, list);
  }
  return map;
}

function totalDays(start: string, end: string): number {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(diff / 86_400_000) + 1);
}

// --- data hooks ---

interface TripWithItems {
  trip: Trip;
  items: ItineraryItem[];
}

function useTripDetail(id: string) {
  return useQuery({
    queryKey: ["trip", id],
    queryFn: async () => {
      // Backend returns trip with items embedded
      const res = await apiClient.get<ApiResponse<Trip & { items: ItineraryItem[] }>>(`/itinerary/trips/${id}`);
      const payload = res.data.data!;
      return {
        trip: payload,
        items: payload.items ?? [],
      } as TripWithItems;
    },
    enabled: !!id,
  });
}

// --- page component ---

/** Itinerary detail page showing a day-by-day trip timeline. */
export default function ItineraryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useTripDetail(id ?? "");

  if (isLoading) return <PageSpinner />;

  if (isError || !data) {
    return (
      <div className="py-20 text-center">
        <p className="font-medium text-[var(--foreground)]">Không tìm thấy lịch trình.</p>
        <Link to="/dashboard" className="mt-2 inline-block text-sm text-teal-600 hover:underline">
          Về trang chủ
        </Link>
      </div>
    );
  }

  const { trip, items } = data;
  const dayMap   = groupByDay(items);
  const numDays  = totalDays(trip.startDate, trip.endDate);
  const dayNums  = Array.from({ length: numDays }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-[var(--muted-foreground)]">
        <Link to="/dashboard" className="hover:text-teal-600">Trang chủ</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-[var(--foreground)] line-clamp-1">{trip.title}</span>
      </nav>

      {/* Header card */}
      <div
        className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6"
        style={trip.coverImage ? { backgroundImage: `url(${trip.coverImage})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        {trip.coverImage && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        )}
        <div className={`relative space-y-3 ${trip.coverImage ? "text-white" : ""}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{trip.title}</h1>
              <div className="mt-1 flex items-center gap-1.5 text-sm opacity-80">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{trip.destination}</span>
              </div>
            </div>
            <Badge
              className={`border text-xs font-bold tracking-wide ${!trip.coverImage ? STATUS_COLOR[trip.status] : "bg-white/20 text-white border-white/40"}`}
            >
              {STATUS_LABEL[trip.status]}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 opacity-80">
              <CalendarDays className="h-4 w-4" />
              <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
            </div>
            <div className="flex items-center gap-1.5 opacity-80">
              <Users className="h-4 w-4" />
              <span>{trip.guests} khách</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className={trip.coverImage ? "border-white/40 bg-white/10 text-white hover:bg-white/20" : ""}
              onClick={() => window.print()}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Xuất PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={trip.coverImage ? "border-white/40 bg-white/10 text-white hover:bg-white/20" : ""}
              onClick={() => navigator.share?.({ title: trip.title, url: window.location.href })}
            >
              <Share2 className="mr-1.5 h-4 w-4" />
              Chia sẻ
            </Button>
          </div>
        </div>
      </div>

      {/* Notes */}
      {trip.notes && (
        <p className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          {trip.notes}
        </p>
      )}

      {/* Day sections */}
      <div className="space-y-8">
        {dayNums.map((day) => (
          <ItineraryDaySection
            key={day}
            dayNumber={day}
            items={dayMap.get(day) ?? []}
            tripStartDate={trip.startDate}
          />
        ))}
      </div>

      {/* Floating Ask Assistant button */}
      <Link
        to="/chat"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-teal-700 transition-colors"
      >
        <MessageCircle className="h-4 w-4" />
        Hỏi trợ lý
      </Link>
    </div>
  );
}
