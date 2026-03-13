import { useRef, useCallback, type ChangeEvent } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export interface HotelFilters {
  search?: string;
  location?: string;
  minStars?: number;
  maxPrice?: number;
}

interface HotelFiltersProps {
  filters: HotelFilters;
  onChange: (filters: HotelFilters) => void;
}

const LOCATION_OPTIONS = [
  { value: "", label: "Tất cả vị trí" },
  { value: "Kyoto, Japan", label: "Kyoto, Japan" },
  { value: "Da Nang, Vietnam", label: "Da Nang, Vietnam" },
  { value: "Nha Trang, Vietnam", label: "Nha Trang, Vietnam" },
];

const STAR_OPTIONS = [
  { value: "", label: "Tất cả sao" },
  { value: "3", label: "3+ sao" },
  { value: "4", label: "4+ sao" },
  { value: "5", label: "5 sao" },
];

const PRICE_OPTIONS = [
  { value: "", label: "Tất cả giá" },
  { value: "200", label: "Dưới $200" },
  { value: "400", label: "$200 - $400" },
  { value: "9999", label: "$400+" },
];


/** Hotel filter row: search, location, star rating, price range. */
export function HotelFiltersBar({ filters, onChange }: HotelFiltersProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onChange({ ...filters, search: value });
      }, 300);
    },
    [filters, onChange],
  );

  const handleLocation = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => onChange({ ...filters, location: e.target.value || undefined }),
    [filters, onChange],
  );

  const handleStars = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) =>
      onChange({ ...filters, minStars: e.target.value ? Number(e.target.value) : undefined }),
    [filters, onChange],
  );

  const handlePrice = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) =>
      onChange({ ...filters, maxPrice: e.target.value ? Number(e.target.value) : undefined }),
    [filters, onChange],
  );

  const hasFilters = filters.search || filters.location || filters.minStars || filters.maxPrice;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <Input
          placeholder="Tìm khách sạn..."
          defaultValue={filters.search}
          onChange={handleSearchChange}
          className="rounded-full pl-9"
        />
      </div>

      <Select options={LOCATION_OPTIONS} value={filters.location ?? ""} onChange={handleLocation} />
      <Select options={STAR_OPTIONS} value={filters.minStars?.toString() ?? ""} onChange={handleStars} />
      <Select options={PRICE_OPTIONS} value={filters.maxPrice?.toString() ?? ""} onChange={handlePrice} />

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({})}
          className="rounded-full"
        >
          <X className="mr-1 h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
