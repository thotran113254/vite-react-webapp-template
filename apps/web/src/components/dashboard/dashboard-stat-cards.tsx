import {
  Users,
  Package,
  Hotel,
  CalendarCheck,
  DollarSign,
  BookOpen,
  MessageSquare,
  BedDouble,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  subtitle?: string;
}

function StatCard({ label, value, icon: Icon, colorClass, subtitle }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className={`rounded-full p-3 ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-[var(--foreground)]">{value}</p>
          <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
          {subtitle && (
            <p className="text-xs text-[var(--muted-foreground)]">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

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
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

export function DashboardStatCards({ stats }: { stats: DashboardStats }) {
  const cards: StatCardProps[] = [
    {
      label: "Tổng người dùng",
      value: stats.users.total,
      icon: Users,
      colorClass: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      subtitle: `${stats.users.admins} admin, ${stats.users.regularUsers} user`,
    },
    {
      label: "Khách sạn",
      value: stats.hotels.total,
      icon: Hotel,
      colorClass: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
      subtitle: `${stats.hotels.totalRooms} phòng, ${stats.hotels.avgStarRating} sao TB`,
    },
    {
      label: "Đặt phòng",
      value: stats.bookings.total,
      icon: CalendarCheck,
      colorClass: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
      subtitle: `${stats.bookings.confirmed} xác nhận, ${stats.bookings.pending} chờ`,
    },
    {
      label: "Doanh thu",
      value: formatCurrency(stats.bookings.totalRevenue),
      icon: DollarSign,
      colorClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
      subtitle: `TB ${formatCurrency(stats.bookings.avgBookingValue)}/đơn`,
    },
    {
      label: "Tài nguyên",
      value: stats.resources.total,
      icon: Package,
      colorClass: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
      subtitle: `${stats.resources.active} hoạt động, ${stats.resources.error} lỗi`,
    },
    {
      label: "Bài viết KB",
      value: stats.knowledgeBase.total,
      icon: BookOpen,
      colorClass: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
      subtitle: `${stats.knowledgeBase.published} đã xuất bản`,
    },
    {
      label: "Phiên chat",
      value: stats.chatSessions.total,
      icon: MessageSquare,
      colorClass: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
    },
    {
      label: "Tổng phòng",
      value: stats.hotels.totalRooms,
      icon: BedDouble,
      colorClass: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}
