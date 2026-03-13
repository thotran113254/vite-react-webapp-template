import { MapPin, Calendar, Clock } from "lucide-react";
import type { Trip, TripStatus } from "@app/shared";

interface DashboardTripCardProps {
  trip: Trip;
}

const STATUS_LABELS: Record<TripStatus, string> = {
  draft: "Bản nháp",
  active: "Đang hoạt động",
  completed: "Đã hoàn thành",
  cancelled: "Đã hủy",
};

const STATUS_COLORS: Record<TripStatus, string> = {
  draft: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  active: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "short",
  });
  const end = new Date(endDate).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return `${start} - ${end}`;
}

function getDurationDays(startDate: string, endDate: string): number {
  const diff = new Date(endDate).getTime() - new Date(startDate).getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/** Compact trip card for the Active Drafts grid section. */
export function DashboardTripCard({ trip }: DashboardTripCardProps) {
  const duration = getDurationDays(trip.startDate, trip.endDate);

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm transition hover:shadow-md">
      {/* Cover image */}
      <div className="relative h-32 bg-gradient-to-br from-teal-400 to-teal-600">
        {trip.coverImage ? (
          <img
            src={trip.coverImage}
            alt={trip.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <MapPin className="h-10 w-10 text-white/60" />
          </div>
        )}
        {/* Status badge overlaid on image */}
        <span
          className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[trip.status]}`}
        >
          {STATUS_LABELS[trip.status]}
        </span>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-1 font-semibold text-[var(--foreground)] group-hover:text-teal-600">
          {trip.title}
        </h3>

        <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{trip.destination}</span>
        </div>

        <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
        </div>

        <div className="mt-auto flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>{duration} ngày</span>
        </div>
      </div>
    </div>
  );
}
