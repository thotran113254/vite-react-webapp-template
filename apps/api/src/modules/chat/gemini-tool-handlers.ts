import {
  fetchMarketOverview,
  fetchMarketPricing,
  fetchMarketAttractions,
  fetchItineraryTemplates,
  fetchMarketBusinessData,
  fetchKnowledgeBaseArticles,
  fetchPropertyDetails,
  fetchTransportPricing,
  fetchFormattedCombo,
} from "../market-data/ai-data-fetchers.js";
import {
  fetchCompareProperties,
  fetchSearchProperties,
} from "../market-data/ai-comparison-fetchers.js";

type ToolArgs = Record<string, unknown>;

const handlers: Record<string, (args: ToolArgs) => Promise<string>> = {
  getMarketOverview: (args) =>
    fetchMarketOverview(args.slug as string),

  getPropertyDetails: (args) =>
    fetchPropertyDetails(args.slug as string, args.propertySlug as string),

  getPropertyPricing: (args) =>
    fetchMarketPricing(args.slug as string, {
      propertySlug: args.propertySlug as string | undefined,
      comboType: args.comboType as string | undefined,
      dayType: args.dayType as string | undefined,
    }),

  compareProperties: (args) =>
    fetchCompareProperties(
      (args.items as Array<{ slug: string; propertySlug: string }>) ?? [],
      {
        comboType: args.comboType as string | undefined,
        dayType: args.dayType as string | undefined,
      },
    ),

  searchProperties: (args) =>
    fetchSearchProperties({
      type: args.type as string | undefined,
      starMin: args.starMin as number | undefined,
      region: args.region as string | undefined,
      capacity: args.capacity as number | undefined,
    }),

  getMarketAttractions: (args) =>
    fetchMarketAttractions(args.slug as string),

  getItineraryTemplates: (args) =>
    fetchItineraryTemplates(args.slug as string, {
      durationDays: args.durationDays as number | undefined,
      customerType: args.customerType as string | undefined,
    }),

  getMarketBusinessData: (args) =>
    fetchMarketBusinessData(args.slug as string),

  searchKnowledgeBase: (args) =>
    fetchKnowledgeBaseArticles(args.query as string),

  getTransportPricing: (args) =>
    fetchTransportPricing(args.slug as string, {
      category: args.category as string | undefined,
    }),
};

/** Role-aware handlers — receive userRole to show admin vs user pricing */
function buildComboHandler(userRole: string) {
  return (args: ToolArgs) =>
    fetchFormattedCombo(
      {
        marketSlug: args.marketSlug as string,
        propertySlug: args.propertySlug as string | undefined,
        numAdults: (args.numAdults as number) ?? 2,
        numChildrenUnder10: (args.numChildrenUnder10 as number) ?? 0,
        numChildrenUnder5: (args.numChildrenUnder5 as number) ?? 0,
        numNights: (args.numNights as number) ?? 1,
        dayTypes: args.dayTypes as string[] | undefined,
        dayType: (args.dayType as string) ?? "weekday",
        transportClass: args.transportClass as string | undefined,
        ferryClass: args.ferryClass as string | undefined,
        tripType: args.tripType as "oneway" | "roundtrip" | undefined,
        departureProvince: args.departureProvince as string | undefined,
      },
      userRole,
    );
}

/**
 * Execute a tool call by name. Returns formatted data string.
 * Catches all errors and returns error message (never throws).
 */
export async function executeToolCall(
  name: string,
  args: ToolArgs,
  userRole: string,
): Promise<string> {
  // Role-aware tools
  if (name === "calculateComboPrice") {
    try {
      return await buildComboHandler(userRole)(args);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Tool execution failed";
      return `Error: ${msg}`;
    }
  }

  const handler = handlers[name];
  if (!handler) return `Unknown tool: ${name}`;
  try {
    return await handler(args);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Tool execution failed";
    return `Error: ${msg}`;
  }
}
