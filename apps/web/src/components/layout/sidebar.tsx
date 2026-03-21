import { NavLink } from "react-router-dom";
import {
  MessageSquare,
  Hotel,
  BookOpen,
  Users,
  UserCircle,
  LayoutDashboard,
  Compass,
  Globe,
  Settings,
  Calculator,
  Banknote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { to: "/chat", label: "Trợ lý AI", icon: MessageSquare },
  { to: "/hotels", label: "Khách sạn", icon: Hotel },
  { to: "/combo-calculator", label: "Tính giá combo", icon: Calculator },
  { to: "/profile", label: "Hồ sơ", icon: UserCircle, section: "Cài đặt" },
  // Admin section
  { to: "/markets", label: "Thị trường", icon: Globe, adminOnly: true, section: "Quản trị" },
  { to: "/pricing", label: "Quản lý giá", icon: Banknote, adminOnly: true },
  { to: "/knowledge-base", label: "Cơ sở tri thức", icon: BookOpen, adminOnly: true },
  { to: "/settings/ai", label: "Cài đặt AI", icon: Settings, adminOnly: true },
  { to: "/users", label: "Người dùng", icon: Users, adminOnly: true },
];

/** Sidebar navigation with role-based link visibility. */
export function Sidebar() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || isAdmin,
  );

  let lastSection: string | undefined;

  return (
    <aside className="flex h-full w-64 flex-col border-r border-[var(--border)] bg-[var(--card)]">
      {/* Logo / Brand */}
      <div className="flex h-16 items-center border-b border-[var(--border)] px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600">
          <Compass className="h-4 w-4 text-white" />
        </div>
        <span className="ml-2 text-lg font-semibold text-[var(--foreground)]">
          AI Travel
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleItems.map(({ to, label, icon: Icon, section }) => {
          const showSection = section && section !== lastSection;
          if (section) lastSection = section;
          return (
            <div key={to}>
              {showSection && (
                <p className="mb-1 mt-4 px-3 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  {section}
                </p>
              )}
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
                      : "text-[var(--muted-foreground)] hover:bg-teal-50/50 hover:text-teal-700 dark:hover:bg-teal-900/20 dark:hover:text-teal-300",
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            </div>
          );
        })}
      </nav>

      {/* User info footer */}
      {user && (
        <div className="border-t border-[var(--border)] px-4 py-3">
          <p className="truncate text-sm font-medium text-[var(--foreground)]">
            {user.name}
          </p>
          <p className="truncate text-xs text-[var(--muted-foreground)]">
            {user.email}
          </p>
        </div>
      )}
    </aside>
  );
}
