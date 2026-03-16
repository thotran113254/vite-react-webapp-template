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

  // Build label lookup maps
  const comboMap = new Map(comboOptions.map((o) => [o.optionKey, o.label]));
  const dayMap = new Map(dayOptions.map((o) => [o.optionKey, o.label]));

  const comboLabel = (key: string) => comboMap.get(key) ?? key;
  const dayLabel = (key: string) => dayMap.get(key) ?? key;

  return { comboOptions, dayOptions, comboLabel, dayLabel, all, isLoading };
}
