import { eq, and } from "drizzle-orm";
import { db } from "../../db/connection.js";
import {
  markets,
  marketCompetitors,
  marketCustomerJourneys,
  marketTargetCustomers,
  marketAttractions,
  marketDiningSpots,
  marketTransportation,
  marketInventoryStrategies,
  marketProperties,
  propertyRooms,
  roomPricing,
  pricingConfigs,
  pricingOptions,
  itineraryTemplates,
  itineraryTemplateItems,
  aiDataSettings,
} from "../../db/schema/index.js";
import type { RoomPricingRecord } from "../../db/schema/room-pricing-schema.js";
import type { PropertyRoomRecord } from "../../db/schema/property-rooms-schema.js";
import type { MarketPropertyRecord } from "../../db/schema/market-properties-schema.js";
import {
  formatMarketHeader,
  formatProperties,
  formatTargetCustomers,
  formatAttractions,
  formatDining,
  formatTransportation,
  formatItineraries,
  formatCompetitors,
  formatInventoryStrategies,
  formatCustomerJourneys,
  formatPricingRules,
  setPricingOptionLabels,
  formatPricingOptionDefinitions,
  setPricingOptionConfigs,
} from "./ai-context-format-helpers.js";

// Simple in-memory cache (5 min TTL)
let cachedContext: string | null = null;
let cachedAt = 0;
const CACHE_TTL = 5 * 60 * 1000;

export function invalidateAiContextCache(): void {
  cachedContext = null;
}

async function getAiSettings(): Promise<Record<string, boolean>> {
  const rows = await db.select().from(aiDataSettings);
  return Object.fromEntries(rows.map((r) => [r.dataCategory, r.isEnabled]));
}

async function fetchPropertiesWithRooms(
  marketId: string,
  includePricing: boolean,
): Promise<
  Array<{
    prop: MarketPropertyRecord;
    rooms: Array<{ room: PropertyRoomRecord; prices: RoomPricingRecord[] }>;
  }>
> {
  const props = await db
    .select()
    .from(marketProperties)
    .where(
      and(
        eq(marketProperties.marketId, marketId),
        eq(marketProperties.aiVisible, true),
      ),
    );

  const result = [];
  for (const prop of props) {
    const rooms = await db
      .select()
      .from(propertyRooms)
      .where(
        and(
          eq(propertyRooms.propertyId, prop.id),
          eq(propertyRooms.aiVisible, true),
        ),
      );

    const roomsWithPrices = await Promise.all(
      rooms.map(async (room) => {
        if (!includePricing) return { room, prices: [] };
        const prices = await db
          .select()
          .from(roomPricing)
          .where(
            and(
              eq(roomPricing.roomId, room.id),
              eq(roomPricing.aiVisible, true),
            ),
          );
        return { room, prices };
      }),
    );

    result.push({ prop, rooms: roomsWithPrices });
  }
  return result;
}

async function fetchItinerariesWithItems(
  marketId: string,
): Promise<{ templates: (typeof itineraryTemplates.$inferSelect)[]; itemsByTemplate: Map<string, (typeof itineraryTemplateItems.$inferSelect)[]> }> {
  const templates = await db
    .select()
    .from(itineraryTemplates)
    .where(
      and(
        eq(itineraryTemplates.marketId, marketId),
        eq(itineraryTemplates.aiVisible, true),
      ),
    );

  const itemsByTemplate = new Map<string, (typeof itineraryTemplateItems.$inferSelect)[]>();
  await Promise.all(
    templates.map(async (tpl) => {
      const items = await db
        .select()
        .from(itineraryTemplateItems)
        .where(eq(itineraryTemplateItems.templateId, tpl.id));
      itemsByTemplate.set(tpl.id, items);
    }),
  );

  return { templates, itemsByTemplate };
}

async function buildMarketSection(
  market: typeof markets.$inferSelect,
  settings: Record<string, boolean>,
  allPricingConfigs: (typeof pricingConfigs.$inferSelect)[],
): Promise<string> {
  let text = formatMarketHeader(market);

  if (settings["property"]) {
    const propsWithRooms = await fetchPropertiesWithRooms(
      market.id,
      !!settings["pricing"],
    );
    text += formatProperties(propsWithRooms, !!settings["pricing"]);
  }

  if (settings["target_customer"]) {
    const targets = await db
      .select()
      .from(marketTargetCustomers)
      .where(
        and(
          eq(marketTargetCustomers.marketId, market.id),
          eq(marketTargetCustomers.aiVisible, true),
        ),
      );
    text += formatTargetCustomers(targets);
  }

  if (settings["attraction"]) {
    const attrs = await db
      .select()
      .from(marketAttractions)
      .where(
        and(
          eq(marketAttractions.marketId, market.id),
          eq(marketAttractions.aiVisible, true),
        ),
      );
    text += formatAttractions(attrs);
  }

  if (settings["dining"]) {
    const dining = await db
      .select()
      .from(marketDiningSpots)
      .where(
        and(
          eq(marketDiningSpots.marketId, market.id),
          eq(marketDiningSpots.aiVisible, true),
        ),
      );
    text += formatDining(dining);
  }

  if (settings["transportation"]) {
    const transport = await db
      .select()
      .from(marketTransportation)
      .where(
        and(
          eq(marketTransportation.marketId, market.id),
          eq(marketTransportation.aiVisible, true),
        ),
      );
    text += formatTransportation(transport);
  }

  if (settings["itinerary"]) {
    const { templates, itemsByTemplate } = await fetchItinerariesWithItems(
      market.id,
    );
    text += formatItineraries(templates, itemsByTemplate);
  }

  if (settings["competitor"]) {
    const comps = await db
      .select()
      .from(marketCompetitors)
      .where(
        and(
          eq(marketCompetitors.marketId, market.id),
          eq(marketCompetitors.aiVisible, true),
        ),
      );
    text += formatCompetitors(comps);
  }

  if (settings["inventory_strategy"]) {
    const strategies = await db
      .select()
      .from(marketInventoryStrategies)
      .where(
        and(
          eq(marketInventoryStrategies.marketId, market.id),
          eq(marketInventoryStrategies.aiVisible, true),
        ),
      );
    text += formatInventoryStrategies(strategies);
  }

  if (settings["journey"]) {
    const journeys = await db
      .select()
      .from(marketCustomerJourneys)
      .where(
        and(
          eq(marketCustomerJourneys.marketId, market.id),
          eq(marketCustomerJourneys.aiVisible, true),
        ),
      );
    text += formatCustomerJourneys(journeys);
  }

  if (settings["pricing"]) {
    text += formatPricingRules(allPricingConfigs, market.id);
  }

  return text;
}

export async function buildAiContext(): Promise<string> {
  if (cachedContext && Date.now() - cachedAt < CACHE_TTL) {
    return cachedContext;
  }

  const [settings, activeMarkets, allPricingConfigs, allPricingOptions] = await Promise.all([
    getAiSettings(),
    db
      .select()
      .from(markets)
      .where(and(eq(markets.status, "active"), eq(markets.aiVisible, true))),
    db
      .select()
      .from(pricingConfigs)
      .where(eq(pricingConfigs.aiVisible, true)),
    db
      .select()
      .from(pricingOptions)
      .where(and(eq(pricingOptions.isActive, true), eq(pricingOptions.aiVisible, true))),
  ]);

  // Load dynamic labels and configs for combo/day types so formatters use admin-configured values
  setPricingOptionLabels(allPricingOptions);
  setPricingOptionConfigs(allPricingOptions);

  const sections: string[] = [];

  for (const market of activeMarkets) {
    if (!settings["market"]) continue;
    const section = await buildMarketSection(
      market,
      settings,
      allPricingConfigs,
    );
    sections.push(section);
  }

  // Add pricing option definitions so AI understands combo/day type mappings
  const optionDefs = formatPricingOptionDefinitions();
  if (optionDefs) sections.unshift(optionDefs);

  const result =
    sections.length > 0
      ? sections.join("\n\n")
      : "(Chưa có dữ liệu thị trường trong hệ thống)";

  cachedContext = result;
  cachedAt = Date.now();
  return result;
}
