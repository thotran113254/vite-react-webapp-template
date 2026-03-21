import { PricingOptionsManager } from "@/components/market-data/pricing-options-manager";
import { PricingSeasonsTab } from "@/components/pricing/pricing-seasons-tab";

/** Combined config tab: seasons + combo types + day types. */
export function PricingConfigTab() {
  return (
    <div className="space-y-8">
      <PricingSeasonsTab />
      <div className="border-t border-[var(--border)] pt-6">
        <PricingOptionsManager />
      </div>
    </div>
  );
}
