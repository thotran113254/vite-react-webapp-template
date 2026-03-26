import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ResourceBreakdownProps {
  total: number;
  active: number;
  inactive: number;
  pending: number;
  error: number;
}

export function DashboardResourceBreakdown(props: ResourceBreakdownProps) {
  const items = [
    {
      label: "Hoạt động",
      value: props.active,
      icon: CheckCircle,
      colorClass: "text-green-600 dark:text-green-400",
    },
    {
      label: "Không hoạt động",
      value: props.inactive,
      icon: XCircle,
      colorClass: "text-gray-500 dark:text-gray-400",
    },
    {
      label: "Chờ xử lý",
      value: props.pending,
      icon: Clock,
      colorClass: "text-yellow-600 dark:text-yellow-400",
    },
    {
      label: "Lỗi",
      value: props.error,
      icon: AlertTriangle,
      colorClass: "text-red-600 dark:text-red-400",
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Tài nguyên ({props.total})</CardTitle>
        <Link
          to="/resources"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Quản lý <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {items.map(({ label, value, icon: Icon, colorClass }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] p-3"
            >
              <Icon className={`h-5 w-5 ${colorClass}`} />
              <div>
                <p className="text-lg font-bold text-[var(--foreground)]">{value}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
