import { eq, and, sql } from "drizzle-orm";
import { db, queryClient } from "../connection.js";
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
  evaluationCriteria,
  propertyEvaluations,
  itineraryTemplates,
  itineraryTemplateItems,
  pricingConfigs,
  pricingOptions,
  aiDataSettings,
} from "../schema/index.js";

import { marketsData } from "./data/markets-seed-data.js";
import { competitorsData } from "./data/competitors-seed-data.js";
import { customerJourneysData } from "./data/customer-journeys-seed-data.js";
import { targetCustomersData } from "./data/target-customers-seed-data.js";
import { attractionsData } from "./data/attractions-seed-data.js";
import { diningSpotsData } from "./data/dining-spots-seed-data.js";
import { transportationData } from "./data/transportation-seed-data.js";
import { inventoryStrategiesData } from "./data/inventory-strategies-seed-data.js";
import { propertiesData } from "./data/properties-seed-data.js";
import { evaluationCriteriaData } from "./data/evaluation-criteria-seed-data.js";
import { itineraryTemplatesData } from "./data/itinerary-templates-seed-data.js";
import { pricingConfigsData } from "./data/pricing-configs-seed-data.js";
import { pricingOptionsSeedData } from "./data/pricing-options-seed-data.js";
import { aiSettingsData } from "./data/ai-settings-seed-data.js";

// Room pricing combos and day types
const COMBO_TYPES = ["3n2d", "2n1d", "per_night"] as const;
const DAY_TYPES = ["weekday", "friday", "saturday", "sunday"] as const;

const PRICE_MATRIX: Record<string, Record<string, number>> = {
  "3n2d":    { weekday: 2800000, friday: 3000000, saturday: 3200000, sunday: 3000000 },
  "2n1d":    { weekday: 1800000, friday: 2000000, saturday: 2200000, sunday: 2000000 },
  "per_night":{ weekday: 1500000, friday: 1700000, saturday: 1900000, sunday: 1700000 },
};

const ROOM_PREMIUM: Record<string, number> = {
  "BX-DLX": 1.3, "BX-FAM": 1.2,
  "HB-STD": 0.85, "HB-TRP": 0.9,
  "CE-DLX": 1.5, "CE-STD": 1.1,
  "LH-STD": 1.0, "LH-FAM": 1.25,
  "SB-SUP": 1.2, "SB-DLX": 1.5,
};

/** Helper: count rows in a table */
async function countRows(table: Parameters<typeof db.select>[0] extends undefined ? any : any, where?: any) {
  const result = await db.select({ count: sql<number>`count(*)` }).from(table).where(where);
  return Number(result[0]?.count ?? 0);
}

// ─── Markets: upsert by slug ─────────────────────────────────────────────────
async function seedMarkets() {
  const existing = await db.select({ slug: markets.slug, id: markets.id }).from(markets);
  const existingSlugs = new Set(existing.map((m) => m.slug));
  const existingMap = Object.fromEntries(existing.map((m) => [m.slug, m.id]));

  const toInsert = marketsData.filter((m) => !existingSlugs.has(m.slug));
  if (toInsert.length > 0) {
    const inserted = await db.insert(markets).values(toInsert).returning();
    for (const m of inserted) existingMap[m.slug] = m.id;
    console.log(`  Inserted ${inserted.length} new markets (skipped ${marketsData.length - toInsert.length} existing)`);
  } else {
    console.log(`  Markets: all ${marketsData.length} already exist, skipped`);
  }
  return existingMap;
}

// ─── Generic: seed related data only if market has no data yet ────────────────
async function seedIfEmpty(
  label: string,
  table: any,
  marketIdCol: any,
  marketIds: Record<string, string>,
  dataMap: Record<string, any[]>,
) {
  let inserted = 0;
  let skipped = 0;
  for (const [slug, rows] of Object.entries(dataMap)) {
    const marketId = marketIds[slug];
    if (!marketId) continue;
    const existing = await countRows(table, eq(marketIdCol, marketId));
    if (existing > 0) { skipped += rows.length; continue; }
    await db.insert(table).values(rows.map((r: any) => ({ ...r, marketId })));
    inserted += rows.length;
  }
  console.log(`  ${label}: inserted ${inserted}, skipped ${skipped} (already exist)`);
}

// ─── Evaluation criteria: skip if already exist ──────────────────────────────
async function seedEvaluationCriteria() {
  const existing = await db.select().from(evaluationCriteria);
  if (existing.length > 0) {
    console.log(`  Evaluation criteria: ${existing.length} already exist, skipped`);
    return existing;
  }
  const inserted = await db.insert(evaluationCriteria).values(evaluationCriteriaData).returning();
  console.log(`  Inserted ${inserted.length} evaluation criteria`);
  return inserted;
}

// ─── Properties: upsert by slug, PRESERVE images/user-modified data ──────────
const evalValues: Record<string, Record<string, string>> = {
  "bien-xanh-phu-quy": {
    "Khoảng cách đến biển": "1km", "Khoảng cách đến trung tâm": "500m",
    "Khoảng cách đến cảng/bến tàu": "500m", "Diện tích phòng": "25–35m²",
    "View từ phòng": "Biển (tầng thượng)", "Loại giường": "Queen/Đôi",
    "Điều hòa nhiệt độ": "Có", "Wifi tốc độ": "20Mbps",
    "WC riêng hay chung": "Riêng", "Nước nóng lạnh": "Có",
    "Vệ sinh sạch sẽ": "Tốt", "Bữa sáng": "Tùy chọn (+50k)",
    "Cho thuê xe máy/xe đạp": "Có (150k/ngày)", "Hỗ trợ đặt tour": "Có",
    "Check-in/Check-out linh hoạt": "Linh hoạt", "View biển/vịnh": "Sân thượng",
    "View từ sân thượng/ban công": "Toàn cảnh biển",
  },
  "hoa-bien-phu-quy": {
    "Khoảng cách đến biển": "2km", "Khoảng cách đến trung tâm": "100m",
    "Khoảng cách đến cảng/bến tàu": "800m", "Diện tích phòng": "20–22m²",
    "View từ phòng": "Đường phố", "Loại giường": "Đôi/3 người",
    "Điều hòa nhiệt độ": "Có", "Wifi tốc độ": "15Mbps",
    "WC riêng hay chung": "Chung (STD) / Riêng (TRP)", "Nước nóng lạnh": "Có",
    "Vệ sinh sạch sẽ": "Khá", "Bữa sáng": "Không",
    "Cho thuê xe máy/xe đạp": "Có (120k/ngày)", "Hỗ trợ đặt tour": "Cơ bản",
    "Check-in/Check-out linh hoạt": "Tiêu chuẩn", "View biển/vịnh": "Không",
    "View từ sân thượng/ban công": "Không",
  },
  "coastal-escape-phu-quy": {
    "Khoảng cách đến biển": "Trực tiếp", "Khoảng cách đến trung tâm": "3km",
    "Khoảng cách đến cảng/bến tàu": "3km", "Diện tích phòng": "25–30m²",
    "View từ phòng": "Biển trực tiếp (DLX)", "Loại giường": "King/Queen",
    "Điều hòa nhiệt độ": "Có", "Wifi tốc độ": "30Mbps",
    "WC riêng hay chung": "Riêng", "Nước nóng lạnh": "Có",
    "Vệ sinh sạch sẽ": "Rất tốt", "Bữa sáng": "Bao gồm",
    "Cho thuê xe máy/xe đạp": "Có (miễn phí xe đạp)", "Hỗ trợ đặt tour": "Đầy đủ",
    "Check-in/Check-out linh hoạt": "Linh hoạt", "View biển/vịnh": "Ban công biển (DLX)",
    "View từ sân thượng/ban công": "Biển trực tiếp",
  },
  "lan-ha-bay-homestay": {
    "Khoảng cách đến biển": "2 phút đi bộ", "Khoảng cách đến trung tâm": "10 phút đi bộ",
    "Khoảng cách đến cảng/bến tàu": "15 phút đi xe", "Diện tích phòng": "22–32m²",
    "View từ phòng": "Vịnh (tầng 3)", "Loại giường": "Queen/King+Đơn",
    "Điều hòa nhiệt độ": "Có", "Wifi tốc độ": "25Mbps",
    "WC riêng hay chung": "Riêng", "Nước nóng lạnh": "Có",
    "Vệ sinh sạch sẽ": "Tốt", "Bữa sáng": "Tùy chọn (+60k)",
    "Cho thuê xe máy/xe đạp": "Có (xe đạp miễn phí)", "Hỗ trợ đặt tour": "Đầy đủ (kayak, VQG)",
    "Check-in/Check-out linh hoạt": "Linh hoạt", "View biển/vịnh": "Rooftop bar",
    "View từ sân thượng/ban công": "View vịnh tầng 3",
  },
  "cat-ba-sunrise-boutique": {
    "Khoảng cách đến biển": "10 phút đi bộ", "Khoảng cách đến trung tâm": "Trung tâm",
    "Khoảng cách đến cảng/bến tàu": "300m", "Diện tích phòng": "28–32m²",
    "View từ phòng": "Vịnh (DLX)", "Loại giường": "Đôi/King",
    "Điều hòa nhiệt độ": "Có", "Wifi tốc độ": "50Mbps",
    "WC riêng hay chung": "Riêng", "Nước nóng lạnh": "Có (bồn tắm DLX)",
    "Vệ sinh sạch sẽ": "Rất tốt", "Bữa sáng": "Buffet bao gồm",
    "Cho thuê xe máy/xe đạp": "Tour desk hỗ trợ", "Hỗ trợ đặt tour": "Đầy đủ",
    "Check-in/Check-out linh hoạt": "24h reception", "View biển/vịnh": "Ban công vịnh (DLX)",
    "View từ sân thượng/ban công": "View vịnh (DLX)",
  },
};

async function seedProperties(
  marketIds: Record<string, string>,
  criteriaRows: Array<{ id: string; criteriaName: string }>,
) {
  let propInserted = 0, propSkipped = 0;
  let roomInserted = 0, roomSkipped = 0;
  let pricingInserted = 0, evalInserted = 0;

  for (const [marketSlug, properties] of Object.entries(propertiesData)) {
    const marketId = marketIds[marketSlug];
    if (!marketId) continue;

    for (const prop of properties) {
      const { rooms, ...propData } = prop;

      // Check if property already exists by slug within this market
      const [existingProp] = await db.select()
        .from(marketProperties)
        .where(and(eq(marketProperties.marketId, marketId), eq(marketProperties.slug, prop.slug)))
        .limit(1);

      let propId: string;
      if (existingProp) {
        propId = existingProp.id;
        propSkipped++;
      } else {
        const [inserted] = await db.insert(marketProperties).values({ ...propData, marketId }).returning();
        if (!inserted) continue;
        propId = inserted.id;
        propInserted++;
      }

      // Rooms: check by booking_code within this property
      for (const room of rooms) {
        const [existingRoom] = await db.select()
          .from(propertyRooms)
          .where(and(eq(propertyRooms.propertyId, propId), eq(propertyRooms.bookingCode, room.bookingCode)))
          .limit(1);

        if (existingRoom) { roomSkipped++; continue; }

        const [insertedRoom] = await db.insert(propertyRooms)
          .values({ ...room, propertyId: propId }).returning();
        if (!insertedRoom) continue;
        roomInserted++;

        // Insert room pricing only for NEW rooms
        const premium = ROOM_PREMIUM[room.bookingCode] ?? 1.0;
        const pricingRows = [];
        for (const combo of COMBO_TYPES) {
          for (const day of DAY_TYPES) {
            const base = PRICE_MATRIX[combo]?.[day] ?? 1500000;
            const price = Math.round((base * premium) / 50000) * 50000;
            pricingRows.push({
              roomId: insertedRoom.id, comboType: combo, dayType: day,
              seasonName: "default",
              standardGuests: room.capacity > 2 ? 3 : 2,
              price,
              pricePlus1: Math.round(price * 1.15 / 50000) * 50000,
              priceMinus1: Math.round(price * 0.9 / 50000) * 50000,
              extraNight: Math.round((PRICE_MATRIX["per_night"]?.[day] ?? 1500000) * premium / 50000) * 50000,
            });
          }
        }
        await db.insert(roomPricing).values(pricingRows);
        pricingInserted += pricingRows.length;
      }

      // Evaluations: skip if property already has evaluations
      const existingEvals = await countRows(propertyEvaluations, eq(propertyEvaluations.propertyId, propId));
      if (existingEvals === 0) {
        const propEvalValues = evalValues[prop.slug] ?? {};
        const evalRows = criteriaRows
          .filter((c) => propEvalValues[c.criteriaName])
          .map((c) => ({ propertyId: propId, criteriaId: c.id, value: propEvalValues[c.criteriaName] }));
        if (evalRows.length > 0) {
          await db.insert(propertyEvaluations).values(evalRows);
          evalInserted += evalRows.length;
        }
      }
    }
  }

  console.log(`  Properties: ${propInserted} new, ${propSkipped} skipped`);
  console.log(`  Rooms: ${roomInserted} new, ${roomSkipped} skipped, ${pricingInserted} pricing rows, ${evalInserted} evaluations`);
}

// ─── Itineraries: skip if market already has templates ───────────────────────
async function seedItineraryTemplates(marketIds: Record<string, string>) {
  let templateCount = 0, itemCount = 0, skipped = 0;
  for (const [slug, templates] of Object.entries(itineraryTemplatesData)) {
    const marketId = marketIds[slug];
    if (!marketId) continue;
    const existing = await countRows(itineraryTemplates, eq(itineraryTemplates.marketId, marketId));
    if (existing > 0) { skipped += templates.length; continue; }
    for (const tpl of templates) {
      const { items, ...tplData } = tpl;
      const [inserted] = await db.insert(itineraryTemplates).values({ ...tplData, marketId }).returning();
      if (!inserted) continue;
      templateCount++;
      await db.insert(itineraryTemplateItems).values(items.map((item) => ({ ...item, templateId: inserted.id })));
      itemCount += items.length;
    }
  }
  console.log(`  Itineraries: ${templateCount} templates + ${itemCount} items new, ${skipped} skipped`);
}

// ─── Pricing configs: skip if already exist ──────────────────────────────────
async function seedPricingConfigs() {
  const existing = await countRows(pricingConfigs);
  if (existing > 0) { console.log(`  Pricing configs: ${existing} already exist, skipped`); return; }
  await db.insert(pricingConfigs).values(pricingConfigsData);
  console.log(`  Inserted ${pricingConfigsData.length} pricing configs`);
}

// ─── Pricing options: upsert by unique (category, option_key) ────────────────
async function seedPricingOptions() {
  let inserted = 0, skipped = 0;
  for (const opt of pricingOptionsSeedData) {
    const [existing] = await db.select().from(pricingOptions)
      .where(and(eq(pricingOptions.category, opt.category), eq(pricingOptions.optionKey, opt.optionKey)))
      .limit(1);
    if (existing) { skipped++; continue; }
    await db.insert(pricingOptions).values(opt);
    inserted++;
  }
  console.log(`  Pricing options: ${inserted} new, ${skipped} skipped`);
}

// ─── AI settings: skip if already exist ──────────────────────────────────────
async function seedAiSettings() {
  const existing = await countRows(aiDataSettings);
  if (existing > 0) { console.log(`  AI settings: ${existing} already exist, skipped`); return; }
  await db.insert(aiDataSettings).values(aiSettingsData);
  console.log(`  Inserted ${aiSettingsData.length} AI data settings`);
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Seeding market data (safe mode — preserves existing data)...");
  try {
    const marketIds = await seedMarkets();
    await seedIfEmpty("Competitors", marketCompetitors, marketCompetitors.marketId, marketIds, competitorsData);
    await seedIfEmpty("Customer journeys", marketCustomerJourneys, marketCustomerJourneys.marketId, marketIds, customerJourneysData);
    await seedIfEmpty("Target customers", marketTargetCustomers, marketTargetCustomers.marketId, marketIds, targetCustomersData);
    await seedIfEmpty("Attractions", marketAttractions, marketAttractions.marketId, marketIds, attractionsData);
    await seedIfEmpty("Dining spots", marketDiningSpots, marketDiningSpots.marketId, marketIds, diningSpotsData);
    await seedIfEmpty("Transportation", marketTransportation, marketTransportation.marketId, marketIds, transportationData);
    await seedIfEmpty("Inventory strategies", marketInventoryStrategies, marketInventoryStrategies.marketId, marketIds, inventoryStrategiesData);
    const criteriaRows = await seedEvaluationCriteria();
    await seedProperties(marketIds, criteriaRows);
    await seedItineraryTemplates(marketIds);
    await seedPricingConfigs();
    await seedPricingOptions();
    await seedAiSettings();
    console.log("Seed completed! Existing data preserved.");
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  } finally {
    await queryClient.end();
  }
}

main();
