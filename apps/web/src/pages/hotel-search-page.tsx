import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { PageSpinner } from "@/components/ui/spinner";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { HotelCard } from "@/components/hotels/hotel-card";
import { HotelFiltersBar, type HotelFilters } from "@/components/hotels/hotel-filters";
import { apiClient } from "@/lib/api-client";
import type { Hotel, PaginatedResponse } from "@app/shared";

const PAGE_LIMIT = 12;

/** Hotel search results page with filters, grid, and pagination. */
export default function HotelSearchPage() {
  const [filters, setFilters] = useState<HotelFilters>({});
  const [page, setPage] = useState(1);

  const handleFiltersChange = (newFilters: HotelFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["hotel-list", filters, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(PAGE_LIMIT));
      if (filters.search) params.set("search", filters.search);
      if (filters.location) params.set("location", filters.location);
      if (filters.minStars) params.set("minStars", String(filters.minStars));
      if (filters.maxPrice) params.set("maxPrice", String(filters.maxPrice));
      const res = await apiClient.get<PaginatedResponse<Hotel>>(`/hotels?${params}`);
      return { items: res.data.data ?? [], meta: res.data.meta };
    },
  });

  if (isLoading) return <PageSpinner />;

  const items = data?.items ?? [];
  const total = data?.meta?.total ?? 0;
  const locationLabel = filters.location ? ` tại ${filters.location}` : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          Tìm thấy {total} khách sạn{locationLabel}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Sắp xếp theo mức độ phù hợp và giá
        </p>
      </div>

      {/* Filters */}
      <HotelFiltersBar filters={filters} onChange={handleFiltersChange} />

      {/* Error state */}
      {isError && (
        <p className="text-sm text-red-600">Không thể tải khách sạn. Vui lòng thử lại.</p>
      )}

      {/* Empty state */}
      {!isError && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-medium text-[var(--foreground)]">Không tìm thấy khách sạn</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Thử điều chỉnh bộ lọc để xem thêm kết quả.
          </p>
          <Button className="mt-4 bg-blue-600 hover:bg-blue-700" onClick={() => handleFiltersChange({})}>
            Xóa bộ lọc
          </Button>
        </div>
      )}

      {/* Hotel grid */}
      {items.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((hotel) => (
            <HotelCard key={hotel.id} hotel={hotel} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data?.meta && (
        <Pagination
          page={page}
          totalPages={data.meta.totalPages}
          total={data.meta.total}
          onPageChange={setPage}
        />
      )}

      {/* Xem bản đồ floating button */}
      {items.length > 0 && (
        <div className="flex justify-center pb-4">
          <Button className="rounded-full bg-blue-600 px-6 shadow-lg hover:bg-blue-700">
            <MapPin className="mr-2 h-4 w-4" />
            Xem bản đồ
          </Button>
        </div>
      )}
    </div>
  );
}
