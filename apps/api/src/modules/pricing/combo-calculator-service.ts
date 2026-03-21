import { eq, and } from "drizzle-orm";
import { db } from "../../db/connection.js";
import { pricingConfigs } from "../../db/schema/index.js";
import { resolveMarket } from "../market-data/ai-data-fetchers.js";
import { resolveRoomCandidatesMultiDay, allocateRoomsMultiDay } from "./combo-room-allocator.js";
import { resolveTransportLine } from "./combo-transport-resolver.js";
import type { ComboCalculateRequest, ComboCalculationResult } from "@app/shared";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nightsToComboType(numNights: number): string {
  if (numNights === 1) return "2n1d";
  if (numNights === 2) return "3n2d";
  return "per_night";
}

async function loadProfitMargin(marketId: string, override?: number): Promise<number> {
  if (override !== undefined) return override;
  const configs = await db
    .select()
    .from(pricingConfigs)
    .where(and(eq(pricingConfigs.ruleType, "profit_margin"), eq(pricingConfigs.isActive, true)));
  const marketCfg = configs.find((c) => c.marketId === marketId);
  const globalCfg = configs.find((c) => !c.marketId);
  const cfg = marketCfg ?? globalCfg;
  if (!cfg) return 0;
  const raw = cfg.config as Record<string, unknown>;
  const pct = raw.defaultPercent ?? raw.percent;
  return typeof pct === "number" ? pct : 0;
}

/** Normalize dayTypes: prefer dayTypes array, fall back to repeating dayType */
function normalizeDayTypes(dto: ComboCalculateRequest): string[] {
  if (dto.dayTypes && dto.dayTypes.length > 0) {
    if (dto.dayTypes.length !== dto.numNights) {
      throw new Error(
        `dayTypes length (${dto.dayTypes.length}) must equal numNights (${dto.numNights})`,
      );
    }
    return dto.dayTypes;
  }
  if (dto.dayType) {
    return Array(dto.numNights).fill(dto.dayType);
  }
  throw new Error("dayType or dayTypes required");
}

// ─── Main Calculator ──────────────────────────────────────────────────────────

export async function calculateCombo(
  dto: ComboCalculateRequest,
  userRole: string,
): Promise<ComboCalculationResult> {
  const isAdmin = userRole === "admin";
  const numPeople = dto.numAdults + dto.numChildrenUnder10 + dto.numChildrenUnder5;
  // Under-5 children don't consume room capacity (sleep with parents)
  const numRoomGuests = dto.numAdults + dto.numChildrenUnder10;

  const market = await resolveMarket(dto.marketSlug);
  const comboType = nightsToComboType(dto.numNights);

  // FIX 1: Normalize day types per night (supports mixed-day bookings)
  const dayTypes = normalizeDayTypes(dto);

  // FIX 1+2+3: Single JOIN query, season-aware, multi-day support
  const candidates = await resolveRoomCandidatesMultiDay(
    market.id, dto.propertySlug, comboType, dayTypes,
  );
  const rooms = allocateRoomsMultiDay(
    candidates, numRoomGuests, dayTypes, isAdmin,
    dto.numAdults, dto.numChildrenUnder10,
  );

  // Collect warnings for edge cases
  const warnings: string[] = [];
  if (rooms.length === 0) {
    warnings.push("Không tìm thấy phòng phù hợp cho thị trường/loại ngày đã chọn");
  }

  const roomCost = rooms.reduce((s, r) => s + r.totalRoomCost, 0);
  const roomDiscountCost = isAdmin
    ? rooms.reduce((s, r) => s + (r.totalDiscountCost ?? r.totalRoomCost), 0)
    : null;

  // FIX 4+5: Pass tripType and departureProvince to transport resolver
  const transport = await resolveTransportLine(
    market.id, "bus", dto.transportClass,
    dto.numAdults, dto.numChildrenUnder10, dto.numChildrenUnder5, isAdmin,
    dto.tripType, dto.departureProvince,
  );
  const ferry = await resolveTransportLine(
    market.id, "ferry", dto.ferryClass,
    dto.numAdults, dto.numChildrenUnder10, dto.numChildrenUnder5, isAdmin,
    dto.tripType, dto.departureProvince,
  );

  const transportCost = transport?.totalCost ?? 0;
  const ferryCost = ferry?.totalCost ?? 0;
  const subtotal = roomCost + transportCost + ferryCost;

  const discountSubtotal = isAdmin && roomDiscountCost !== null
    ? roomDiscountCost
      + (transport?.totalDiscountCost ?? transportCost)
      + (ferry?.totalDiscountCost ?? ferryCost)
    : null;

  const marginOverride = isAdmin ? dto.profitMarginOverride : undefined;
  const profitMarginPercent = await loadProfitMargin(market.id, marginOverride);
  const marginAmount = Math.round(subtotal * profitMarginPercent / 100);
  const grandTotal = subtotal + marginAmount;
  const perPerson = numPeople > 0 ? Math.round(grandTotal / numPeople) : 0;

  const discountMarginAmount = discountSubtotal !== null
    ? Math.round(discountSubtotal * profitMarginPercent / 100) : null;
  const discountGrandTotal = discountSubtotal !== null && discountMarginAmount !== null
    ? discountSubtotal + discountMarginAmount : null;
  const discountPerPerson = discountGrandTotal !== null && numPeople > 0
    ? Math.round(discountGrandTotal / numPeople) : null;

  // Primary dayType for display: first night's type (or single dayType)
  const displayDayType = dto.dayType ?? dayTypes[0] ?? "weekday";

  return {
    input: {
      numPeople,
      numNights: dto.numNights,
      dayType: displayDayType,
      dayTypes: dto.dayTypes ?? undefined,
      tripType: dto.tripType,
    },
    rooms,
    transport,
    ferry,
    subtotal,
    profitMarginPercent: isAdmin ? profitMarginPercent : 0,
    marginAmount: isAdmin ? marginAmount : 0,
    grandTotal,
    perPerson,
    discountSubtotal: isAdmin ? discountSubtotal : null,
    discountGrandTotal: isAdmin ? discountGrandTotal : null,
    discountPerPerson: isAdmin ? discountPerPerson : null,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
