import { eq, and } from "drizzle-orm";
import { db } from "../../db/connection.js";
import { transportProviders, transportPricing } from "../../db/schema/index.js";
import type { ComboTransportLine } from "@app/shared";

/** Resolve transport/ferry pricing for combo calculation */
export async function resolveTransportLine(
  marketId: string,
  category: string,
  vehicleClass: string | undefined,
  numAdults: number,
  numChildrenUnder10: number,
  numChildrenUnder5: number,
  isAdmin: boolean,
  tripType?: string,
  departureProvince?: string,
): Promise<ComboTransportLine | null> {
  if (!vehicleClass) return null;

  const providers = await db
    .select()
    .from(transportProviders)
    .where(
      and(
        eq(transportProviders.marketId, marketId),
        eq(transportProviders.transportCategory, category),
        eq(transportProviders.aiVisible, true),
      ),
    )
    .limit(1);

  if (!providers.length) return null;
  const provider = providers[0]!;

  const pricingRows = await db
    .select()
    .from(transportPricing)
    .where(
      and(
        eq(transportPricing.providerId, provider.id),
        eq(transportPricing.vehicleClass, vehicleClass),
        eq(transportPricing.aiVisible, true),
      ),
    )
    .limit(1);

  if (!pricingRows.length) return null;
  const tp = pricingRows[0]!;

  // FIX 5: Trip type - use oneway price if requested, otherwise roundtrip
  const isRoundtrip = tripType !== "oneway";
  const basePrice = isRoundtrip
    ? (tp.roundtripListedPrice ?? tp.onewayListedPrice)
    : tp.onewayListedPrice;
  const baseDiscount = isRoundtrip
    ? (tp.roundtripDiscountPrice ?? tp.onewayDiscountPrice ?? null)
    : (tp.onewayDiscountPrice ?? null);

  const discountAmt = tp.childDiscountAmount ?? 0;
  const childFreeCount = numChildrenUnder5;
  const childDiscountCount = numChildrenUnder10;
  const totalPeople = numAdults + numChildrenUnder10 + numChildrenUnder5;

  const childPricePerPerson = childDiscountCount > 0
    ? Math.max(0, basePrice - discountAmt) : null;

  const adultCost = numAdults * basePrice;
  const childDiscountCost = childDiscountCount * Math.max(0, basePrice - discountAmt);
  let totalCost = adultCost + childDiscountCost;

  let totalDiscountCost: number | null = null;
  if (isAdmin && baseDiscount !== null) {
    const adultDiscountCost = numAdults * baseDiscount;
    const childDiscountCostAdj = childDiscountCount * Math.max(0, baseDiscount - discountAmt);
    totalDiscountCost = adultDiscountCost + childDiscountCostAdj;
  }

  // Cross-province surcharge — track separately for output clarity
  let surchargeProvince: string | null = null;
  let surchargePerPerson: number | null = null;
  let surchargeTotal: number | null = null;

  if (departureProvince && tp.crossProvinceSurcharges) {
    const surcharges = tp.crossProvinceSurcharges as Array<{ province: string; surcharge: number }>;
    const match = surcharges.find((s) => s.province === departureProvince);
    if (match) {
      const payingPassengers = numAdults + numChildrenUnder10;
      surchargeProvince = match.province;
      surchargePerPerson = match.surcharge;
      surchargeTotal = match.surcharge * payingPassengers;
      totalCost += surchargeTotal;
      if (totalDiscountCost !== null) totalDiscountCost += surchargeTotal;
    }
  }

  return {
    providerName: provider.providerName,
    vehicleClass: tp.vehicleClass,
    seatType: tp.seatType,
    pricePerPerson: basePrice,
    discountPerPerson: isAdmin ? baseDiscount : null,
    childPricePerPerson,
    totalPeople,
    childFreeCount,
    childDiscountCount,
    totalCost,
    totalDiscountCost: isAdmin ? totalDiscountCost : null,
    surchargeProvince,
    surchargePerPerson,
    surchargeTotal,
  };
}
