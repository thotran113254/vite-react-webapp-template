import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Plane, CheckCircle2, Clock } from "lucide-react";
import { PageSpinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { DashboardNextTrip } from "@/components/dashboard/dashboard-next-trip";
import { DashboardTripCard } from "@/components/dashboard/dashboard-trip-card";
import { DashboardStatCards } from "@/components/dashboard/dashboard-stat-cards";
import { DashboardRecentBookings } from "@/components/dashboard/dashboard-recent-bookings";
import { DashboardBookingBreakdown } from "@/components/dashboard/dashboard-booking-breakdown";
import { DashboardTopHotels } from "@/components/dashboard/dashboard-top-hotels";
import { DashboardResourceBreakdown } from "@/components/dashboard/dashboard-resource-breakdown";
import type { Trip } from "@app/shared";

interface DashboardStats {
  users: { total: number; admins: number; regularUsers: number };
  resources: { total: number; active: number; inactive: number; pending: number; error: number };
  hotels: { total: number; totalRooms: number; avgStarRating: number };
  bookings: {
    total: number; pending: number; confirmed: number; cancelled: number; completed: number;
    totalRevenue: number; avgBookingValue: number;
  };
  knowledgeBase: { total: number; published: number; draft: number };
  chatSessions: { total: number };
  recentBookings: Array<{
    id: string; hotelName: string; status: string; totalPrice: number;
    checkIn: string; checkOut: string; guests: number; createdAt: string;
  }>;
  topHotels: Array<{
    id: string; name: string; location: string; starRating: number; bookingCount: number;
  }>;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Chào buổi sáng";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

function getTodayLabel(): string {
  return new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function findNextTrip(trips: Trip[]): Trip | undefined {
  const now = Date.now();
  return trips
    .filter((t) => t.status === "active" && new Date(t.startDate).getTime() >= now)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];
}

/** Stat pill for the travel summary row. */
function TravelStatPill({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-[var(--card)] px-4 py-2 shadow-sm">
      <Icon className="h-4 w-4 text-teal-600" />
      <span className="text-sm font-semibold text-[var(--foreground)]">{value}</span>
      <span className="text-sm text-[var(--muted-foreground)]">{label}</span>
    </div>
  );
}

/** Travel-focused dashboard with optional admin section. */
export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: trips, isLoading: tripsLoading } = useQuery({
    queryKey: ["itinerary-trips"],
    queryFn: async () => {
      const res = await apiClient.get<{ success: boolean; data: Trip[] }>("/itinerary/trips");
      return res.data.data;
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await apiClient.get<{ success: boolean; data: DashboardStats }>("/dashboard/stats");
      return res.data.data;
    },
    enabled: isAdmin,
    refetchInterval: 60_000,
  });

  if (tripsLoading) return <PageSpinner />;

  const allTrips = trips ?? [];
  const nextTrip = findNextTrip(allTrips);
  const draftTrips = allTrips.filter((t) => t.status === "draft");
  const completedCount = allTrips.filter((t) => t.status === "completed").length;
  const upcomingCount = allTrips.filter(
    (t) => t.status === "active" && new Date(t.startDate).getTime() >= Date.now(),
  ).length;

  return (
    <div className="space-y-8">
      {/* ── Greeting header ── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            {getGreeting()}, {user?.name}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">{getTodayLabel()}</p>
        </div>

        {/* Travel stats pills */}
        <div className="flex flex-wrap gap-2">
          <TravelStatPill icon={Plane} value={allTrips.length} label="chuyến đi" />
          <TravelStatPill icon={Clock} value={upcomingCount} label="sắp tới" />
          <TravelStatPill icon={CheckCircle2} value={completedCount} label="hoàn thành" />
        </div>
      </div>

      {/* ── Next trip featured card ── */}
      {nextTrip ? (
        <section>
          <DashboardNextTrip trip={nextTrip} />
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-teal-300 bg-teal-50/50 p-8 text-center dark:border-teal-800 dark:bg-teal-950/20">
          <Plane className="mx-auto mb-3 h-10 w-10 text-teal-400" />
          <p className="text-sm font-medium text-teal-700 dark:text-teal-300">
            Bạn chưa có chuyến đi nào sắp tới.
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Hãy lên kế hoạch cho chuyến phiêu lưu tiếp theo!
          </p>
        </div>
      )}

      {/* ── Active drafts section ── */}
      {draftTrips.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Bản nháp đang soạn
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {draftTrips.map((trip) => (
              <DashboardTripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </section>
      )}

      {/* ── Plan a new trip CTA ── */}
      <section>
        <Link
          to="/itinerary/new"
          className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-teal-300 bg-transparent py-6 text-teal-600 transition hover:border-teal-500 hover:bg-teal-50 dark:border-teal-700 dark:hover:bg-teal-950/30"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900">
            <Plus className="h-5 w-5 text-teal-600" />
          </div>
          <span className="text-sm font-semibold">Lên kế hoạch chuyến đi mới</span>
        </Link>
      </section>

      {/* ── Admin section (admins only) ── */}
      {isAdmin && (
        <section className="space-y-6 border-t border-[var(--border)] pt-6">
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              Báo cáo hệ thống
            </h2>
            <p className="text-sm text-[var(--muted-foreground)]">Chỉ hiển thị cho quản trị viên.</p>
          </div>

          {statsLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
            </div>
          )}

          {stats && (
            <>
              <DashboardStatCards stats={stats} />
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <DashboardBookingBreakdown
                  pending={stats.bookings.pending}
                  confirmed={stats.bookings.confirmed}
                  cancelled={stats.bookings.cancelled}
                  completed={stats.bookings.completed}
                  total={stats.bookings.total}
                />
                <DashboardResourceBreakdown {...stats.resources} />
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <DashboardRecentBookings bookings={stats.recentBookings} />
                <DashboardTopHotels hotels={stats.topHotels} />
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
