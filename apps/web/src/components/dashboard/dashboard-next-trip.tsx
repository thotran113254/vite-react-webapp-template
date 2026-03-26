import { MapPin, Calendar, Users, ArrowRight, Edit2, Plane } from "lucide-react";
import { Link } from "react-router-dom";
import type { Trip } from "@app/shared";

interface DashboardNextTripProps {
  trip: Trip;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDurationDays(startDate: string, endDate: string): number {
  const diff = new Date(endDate).getTime() - new Date(startDate).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getDaysUntilTrip(startDate: string): number {
  const diff = new Date(startDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/** Featured card for the nearest upcoming/active trip. */
export function DashboardNextTrip({ trip }: DashboardNextTripProps) {
  const duration = getDurationDays(trip.startDate, trip.endDate);
  const daysUntil = getDaysUntilTrip(trip.startDate);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-lg">
      {/* Background cover image overlay */}
      {trip.coverImage && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${trip.coverImage})` }}
        />
      )}

      {/* Decorative circles */}
      <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/5" />
      <div className="absolute -bottom-8 -left-8 h-48 w-48 rounded-full bg-white/5" />

      <div className="relative p-6">
        {/* Header badge */}
        <div className="mb-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
            <Plane className="h-3 w-3" />
            Chuyến đi tiếp theo
          </span>
          {daysUntil > 0 && (
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
              Còn {daysUntil} ngày
            </span>
          )}
          {daysUntil === 0 && (
            <span className="rounded-full bg-amber-400/80 px-3 py-1 text-xs font-semibold text-amber-900">
              Hôm nay!
            </span>
          )}
        </div>

        {/* Trip title & destination */}
        <h2 className="mb-1 text-2xl font-bold leading-tight">{trip.title}</h2>
        <p className="mb-4 flex items-center gap-1 text-blue-100">
          <MapPin className="h-4 w-4" />
          {trip.destination}
        </p>

        {/* Stats row */}
        <div className="mb-6 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-blue-100">
            <Calendar className="h-4 w-4" />
            <span>
              {formatDate(trip.startDate)} — {formatDate(trip.endDate)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-100">
            <Plane className="h-4 w-4" />
            <span>{duration} ngày</span>
          </div>
          {trip.guests > 0 && (
            <div className="flex items-center gap-1.5 text-blue-100">
              <Users className="h-4 w-4" />
              <span>{trip.guests} khách</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <Link
            to={`/itinerary/${trip.id}`}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow transition hover:bg-blue-50"
          >
            Xem lịch trình
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to={`/itinerary/${trip.id}/edit`}
            className="inline-flex items-center gap-1.5 text-sm text-blue-100 underline-offset-2 hover:text-white hover:underline"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Chỉnh sửa
          </Link>
        </div>
      </div>
    </div>
  );
}
