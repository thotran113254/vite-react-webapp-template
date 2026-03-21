import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Banknote } from "lucide-react";
import { Navigate } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { PricingConfigTab } from "@/components/pricing/pricing-config-tab";
import { PricingRoomOverviewTab } from "@/components/pricing/pricing-room-overview-tab";
import { PricingTransportOverviewTab } from "@/components/pricing/pricing-transport-overview-tab";
import { PricingQuickCalculator } from "@/components/pricing/pricing-quick-calculator";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import type { Market } from "@app/shared";

const TABS = [
  { id: "rooms", label: "Giá phòng" },
  { id: "transport", label: "Giá vận chuyển" },
  { id: "config", label: "Cấu hình" },
] as const;

type TabId = (typeof TABS)[number]["id"];
const selectCls = "flex h-9 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-1 text-sm";

/** Centralized pricing management — one place for all pricing + integrated calculator. */
export default function PricingManagementPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("rooms");
  const [marketId, setMarketId] = useState("");

  if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;

  const { data: markets = [], isLoading: marketsLoading } = useQuery({
    queryKey: ["markets"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Market[] }>("/markets");
      return res.data.data ?? [];
    },
  });

  /* Auto-select first market */
  useEffect(() => {
    if (markets.length > 0 && !marketId) setMarketId(markets[0]!.id);
  }, [markets, marketId]);

  const selectedMarket = markets.find((m) => m.id === marketId);

  return (
    <div className="flex h-full flex-col">
      {/* Header row: title + market selector + tabs */}
      <div className="border-b border-[var(--border)] px-6 py-3 space-y-3">
        <div className="flex items-center gap-3">
          <Banknote className="h-5 w-5 text-teal-600" />
          <h1 className="text-xl font-bold text-[var(--foreground)]">Quản lý giá</h1>
          {activeTab !== "config" && (
            <div className="ml-4 w-52">
              {marketsLoading ? <Spinner size="sm" /> : (
                <select className={selectCls} value={marketId} onChange={(e) => setMarketId(e.target.value)}>
                  {markets.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab.id
                  ? "border-teal-600 text-teal-700 dark:text-teal-400"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
              )}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main content — scrollable */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "rooms" && marketId && (
          <PricingRoomOverviewTab marketId={marketId} isAdmin />
        )}
        {activeTab === "transport" && marketId && (
          <PricingTransportOverviewTab marketId={marketId} isAdmin />
        )}
        {activeTab === "config" && <PricingConfigTab />}
      </div>

      {/* Sticky quick calculator at bottom */}
      {activeTab !== "config" && marketId && (
        <PricingQuickCalculator
          marketSlug={selectedMarket?.slug ?? ""}
          propertySlug={undefined}
        />
      )}
    </div>
  );
}
