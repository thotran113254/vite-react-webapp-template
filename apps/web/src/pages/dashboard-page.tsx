import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { DashboardStatCards } from "@/components/dashboard/dashboard-stat-cards";
import { DashboardRecentBookings } from "@/components/dashboard/dashboard-recent-bookings";
import { DashboardBookingBreakdown } from "@/components/dashboard/dashboard-booking-breakdown";
import { DashboardTopHotels } from "@/components/dashboard/dashboard-top-hotels";
import { DashboardResourceBreakdown } from "@/components/dashboard/dashboard-resource-breakdown";

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

/** Dashboard with greeting + admin stats section. */
export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await apiClient.get<{ success: boolean; data: DashboardStats }>("/dashboard/stats");
      return res.data.data;
    },
    enabled: isAdmin,
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-8">
      {/* ── Greeting header ── */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          {getGreeting()}, {user?.name}
        </h1>
        <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">{getTodayLabel()}</p>
      </div>

      {/* ── Admin section (admins only) ── */}
      {isAdmin && (
        <section className="space-y-6">
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
