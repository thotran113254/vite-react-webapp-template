import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageSpinner } from "@/components/ui/spinner";
import { PricingOptionsManager } from "@/components/market-data/pricing-options-manager";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { Navigate } from "react-router-dom";
import type { AiDataSetting } from "@app/shared";

const CATEGORY_LABELS: Record<string, string> = {
  market: "Thị trường",
  competitor: "Đối thủ cạnh tranh",
  target_customer: "Khách hàng mục tiêu",
  journey: "Hành trình khách hàng",
  attraction: "Điểm du lịch",
  dining: "Ẩm thực",
  transportation: "Phương tiện di chuyển",
  inventory_strategy: "Chiến lược ôm quỹ phòng",
  property: "Cơ sở lưu trú",
  pricing: "Bảng giá phòng",
  itinerary: "Lịch trình mẫu",
  evaluation: "Đánh giá cơ sở lưu trú",
};

/** AI data settings page: toggle which data categories are visible to AI. */
export default function AiSettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["ai-data-settings"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: AiDataSetting[] }>("/ai-data-settings");
      return res.data.data ?? [];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ category, isEnabled }: { category: string; isEnabled: boolean }) => {
      await apiClient.patch(`/ai-data-settings/${category}`, { isEnabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-data-settings"] });
    },
  });

  if (isLoading) return <PageSpinner />;

  const settings = data ?? [];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Cài đặt AI</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Kiểm soát dữ liệu nào AI có thể truy cập khi trả lời khách hàng.
        </p>
      </div>

      {isError && (
        <p className="text-sm text-red-600">Không thể tải cài đặt. Vui lòng thử lại.</p>
      )}

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
        {settings.length === 0 && !isError && (
          <p className="px-5 py-8 text-center text-sm text-[var(--muted-foreground)]">Chưa có cài đặt nào.</p>
        )}
        {settings.map((setting) => {
          const label = CATEGORY_LABELS[setting.dataCategory] ?? setting.dataCategory;
          const isPending = toggleMutation.isPending;

          return (
            <div key={setting.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[var(--foreground)]">{label}</p>
                {setting.description && (
                  <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{setting.description}</p>
                )}
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  Cập nhật: {new Date(setting.updatedAt).toLocaleDateString("vi-VN")}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-sm font-medium ${setting.isEnabled ? "text-teal-600" : "text-[var(--muted-foreground)]"}`}>
                  {setting.isEnabled ? "Bật" : "Tắt"}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={setting.isEnabled}
                  disabled={isPending}
                  onClick={() => toggleMutation.mutate({ category: setting.dataCategory, isEnabled: !setting.isEnabled })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50 ${
                    setting.isEnabled ? "bg-teal-600" : "bg-[var(--muted)]"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      setting.isEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {/* Pricing options (combo/day types) management */}
      <div className="mt-8 pt-6 border-t border-[var(--border)]">
        <PricingOptionsManager />
      </div>
    </div>
  );
}
