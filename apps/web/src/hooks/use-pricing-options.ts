import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PricingOption } from "@app/shared";

/** Fetch and cache pricing options (combo types, day types) from API. */
export function usePricingOptions() {
  const { data, isLoading } = useQuery({
    queryKey: ["pricing-options"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: PricingOption[] }>("/pricing-options");
      return res.data.data ?? [];
    },
    staleTime: 5 * 60 * 1000, // cache 5 min — rarely changes
  });

  const all = data ?? [];
  const comboOptions = all.filter((o) => o.category === "combo_type" && o.isActive);
  const dayOptions = all.filter((o) => o.category === "day_type" && o.isActive);
  const seasonOptions = all.filter((o) => o.category === "season" && o.isActive);

  // Build label lookup maps
  const comboMap = new Map(comboOptions.map((o) => [o.optionKey, o.label]));
  const dayMap = new Map(dayOptions.map((o) => [o.optionKey, o.label]));
  const seasonMap = new Map(seasonOptions.map((o) => [o.optionKey, o.label]));

  const comboLabel = (key: string) => comboMap.get(key) ?? key;
  const dayLabel = (key: string) => dayMap.get(key) ?? key;
  const seasonLabel = (key: string) => (key === "default" ? "Mặc định" : seasonMap.get(key) ?? key);

  /** Get season date range from config JSONB: { startDate: "MM-DD", endDate: "MM-DD" } */
  const seasonDateRange = (key: string) => {
    const opt = seasonOptions.find((o) => o.optionKey === key);
    const cfg = opt?.config as { startDate?: string; endDate?: string } | undefined;
    return cfg ? { startDate: cfg.startDate ?? "", endDate: cfg.endDate ?? "" } : null;
  };

  return { comboOptions, dayOptions, seasonOptions, comboLabel, dayLabel, seasonLabel, seasonDateRange, all, isLoading };
}
