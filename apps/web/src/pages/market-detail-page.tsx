import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/spinner";
import { MarketOverviewTab } from "@/components/market-data/market-overview-tab";
import { PropertiesTab } from "@/components/market-data/properties-tab";
import { ItinerariesTab } from "@/components/market-data/itineraries-tab";
import { CompetitorsTab } from "@/components/market-data/competitors-tab";
import { TargetCustomersTab } from "@/components/market-data/target-customers-tab";
import { CustomerJourneysTab } from "@/components/market-data/customer-journeys-tab";
import { AttractionsTab } from "@/components/market-data/attractions-tab";
import { DiningSpotsTab } from "@/components/market-data/dining-spots-tab";
import { TransportationTab } from "@/components/market-data/transportation-tab";
import { TransportProvidersTab } from "@/components/market-data/transport-providers-tab";
import { InventoryStrategiesTab } from "@/components/market-data/inventory-strategies-tab";
import { KnowledgeUpdatesTab } from "@/components/market-data/knowledge-updates-tab";
import { ExperiencesTab } from "@/components/market-data/experiences-tab";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import type { Market } from "@app/shared";

const TABS = [
  { id: "overview", label: "Tổng quan" },
  { id: "properties", label: "Cơ sở lưu trú" },
  { id: "itineraries", label: "Lịch trình" },
  { id: "competitors", label: "Đối thủ" },
  { id: "target-customers", label: "KH mục tiêu" },
  { id: "customer-journeys", label: "Hành trình KH" },
  { id: "attractions", label: "Điểm du lịch" },
  { id: "dining", label: "Ẩm thực" },
  { id: "transportation", label: "Phương tiện" },
  { id: "transport-providers", label: "Nhà xe/tàu" },
  { id: "inventory", label: "Ôm quỹ phòng" },
  { id: "knowledge", label: "Kiến thức TT" },
  { id: "experiences", label: "Trải nghiệm" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Market detail page with tabbed sub-sections for all market data. */
export default function MarketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const { data: market, isLoading, isError } = useQuery({
    queryKey: ["market", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await apiClient.get<{ data: Market }>(`/markets/${id}`);
      return res.data.data;
    },
  });

  if (isLoading) return <PageSpinner />;

  if (isError || !market) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium text-[var(--foreground)]">Không tìm thấy thị trường</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/markets")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/markets")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{market.name}</h1>
          {market.region && (
            <p className="text-sm text-[var(--muted-foreground)]">{market.region}</p>
          )}
        </div>
      </div>

      {/* Tab nav */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 border-b border-[var(--border)] min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px",
                activeTab === tab.id
                  ? "border-blue-600 text-blue-700 dark:text-blue-400"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "overview" && <MarketOverviewTab market={market} isAdmin={isAdmin} />}
        {activeTab === "properties" && <PropertiesTab marketId={market.id} isAdmin={isAdmin} />}
        {activeTab === "itineraries" && <ItinerariesTab marketId={market.id} isAdmin={isAdmin} />}
        {activeTab === "competitors" && <CompetitorsTab marketId={market.id} isAdmin={isAdmin} />}
        {activeTab === "target-customers" && <TargetCustomersTab marketId={market.id} isAdmin={isAdmin} />}
        {activeTab === "customer-journeys" && <CustomerJourneysTab marketId={market.id} isAdmin={isAdmin} />}
        {activeTab === "attractions" && <AttractionsTab marketId={market.id} isAdmin={isAdmin} />}
        {activeTab === "dining" && <DiningSpotsTab marketId={market.id} isAdmin={isAdmin} />}
        {activeTab === "transportation" && <TransportationTab marketId={market.id} isAdmin={isAdmin} />}
        {activeTab === "transport-providers" && <TransportProvidersTab marketId={market.id} isAdmin={isAdmin} />}
        {activeTab === "inventory" && <InventoryStrategiesTab marketId={market.id} isAdmin={isAdmin} />}
        {activeTab === "knowledge" && <KnowledgeUpdatesTab marketId={market.id} isAdmin={isAdmin} />}
        {activeTab === "experiences" && <ExperiencesTab marketId={market.id} isAdmin={isAdmin} />}
      </div>
    </div>
  );
}
