import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageSpinner } from "@/components/ui/spinner";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { resolveImageUrl } from "@/components/market-data/image-manager";
import type { Market } from "@app/shared";

/** Markets list page: grid of market cards with search and add button. */
export default function MarketsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["markets"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Market[] }>("/markets");
      return res.data.data ?? [];
    },
  });

  const markets = (data ?? []).filter((m) =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.region ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <PageSpinner />;

  const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary"> = {
    active: "success", inactive: "secondary", draft: "warning",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Quản lý Thị Trường</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{markets.length} thị trường</p>
        </div>
        {isAdmin && (
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => navigate("/markets/new")}>
            <Plus className="mr-2 h-4 w-4" /> Thêm thị trường
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <Input
          className="pl-9"
          placeholder="Tìm kiếm thị trường..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Error */}
      {isError && (
        <p className="text-sm text-red-600">Không thể tải dữ liệu. Vui lòng thử lại.</p>
      )}

      {/* Empty state */}
      {!isError && markets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Globe className="mb-4 h-12 w-12 text-[var(--muted-foreground)]" />
          <p className="text-lg font-medium text-[var(--foreground)]">Không tìm thấy thị trường</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {search ? "Thử điều chỉnh từ khóa tìm kiếm." : "Chưa có thị trường nào được tạo."}
          </p>
          {search && (
            <Button variant="outline" className="mt-4" onClick={() => setSearch("")}>
              Xóa tìm kiếm
            </Button>
          )}
        </div>
      )}

      {/* Market grid */}
      {markets.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {markets.map((market) => (
            <button
              key={market.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden text-left transition-shadow hover:shadow-md hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              onClick={() => navigate(`/markets/${market.id}`)}
            >
              {/* Cover image */}
              {(market.images as string[])?.length > 0 ? (
                <div className="aspect-[16/9] overflow-hidden bg-[var(--muted)]/20">
                  <img src={resolveImageUrl((market.images as string[])[0]!)} alt={market.name}
                    loading="lazy" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="aspect-[16/9] flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                  <Globe className="h-10 w-10 text-blue-300" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-[var(--foreground)] line-clamp-1">{market.name}</h3>
                  <Badge variant={STATUS_VARIANT[market.status] ?? "secondary"}>{market.status}</Badge>
                </div>
                {market.region && (
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">{market.region}</p>
                )}
                {market.description && (
                  <p className="mt-2 text-xs text-[var(--muted-foreground)] line-clamp-2">{market.description}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
