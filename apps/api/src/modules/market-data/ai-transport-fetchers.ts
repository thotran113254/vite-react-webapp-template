import { eq, and } from "drizzle-orm";
import { db } from "../../db/connection.js";
import { transportProviders, transportPricing } from "../../db/schema/index.js";
import { resolveMarket } from "./ai-data-fetchers.js";
import { calculateCombo } from "../pricing/combo-calculator-service.js";
import type { ComboCalculateRequest } from "@app/shared";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}tr`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

function fmtVnd(n: number): string {
  return n.toLocaleString("vi-VN") + "₫";
}

// ─── Transport Pricing Formatter ──────────────────────────────────────────────

/**
 * Fetch and format transport pricing (bus/ferry) for AI consumption.
 * Uses LISTED prices only (staff-facing tool).
 */
export async function fetchTransportPricing(
  slug: string,
  filters?: { category?: string },
): Promise<string> {
  const market = await resolveMarket(slug);

  const whereConditions = [
    eq(transportProviders.marketId, market.id),
    eq(transportProviders.aiVisible, true),
    ...(filters?.category
      ? [eq(transportProviders.transportCategory, filters.category)]
      : []),
  ];

  const providers = await db
    .select()
    .from(transportProviders)
    .where(and(...whereConditions))
    .orderBy(transportProviders.sortOrder);

  if (providers.length === 0) {
    return `[GIÁ VẬN CHUYỂN — ${market.name}]\n(Chưa có dữ liệu vận chuyển)\n`;
  }

  let text = `[GIÁ VẬN CHUYỂN — ${market.name}]\n`;

  for (const provider of providers) {
    const pickupPoints = (provider.pickupPoints as Array<{ name: string; time: string }>) ?? [];
    const categoryLabel = provider.transportCategory === "bus" ? "xe khách" : "tàu/ferry";

    text += `\n${provider.providerName} (${categoryLabel}) — ${provider.routeName}\n`;

    if (pickupPoints.length > 0) {
      const points = pickupPoints.map((p) => `${p.time} ${p.name}`).join(", ");
      text += `  Điểm đón: ${points}\n`;
    }

    const pricingRows = await db
      .select()
      .from(transportPricing)
      .where(
        and(
          eq(transportPricing.providerId, provider.id),
          eq(transportPricing.aiVisible, true),
        ),
      )
      .orderBy(transportPricing.sortOrder);

    for (const tp of pricingRows) {
      const capacity =
        tp.capacityPerUnit > 1 ? `${tp.capacityPerUnit}ng` : "1ng";
      const oneway = fmt(tp.onewayListedPrice);
      const roundtrip = tp.roundtripListedPrice
        ? fmt(tp.roundtripListedPrice)
        : null;

      let line = `  ${tp.vehicleClass} ${tp.seatType} (${capacity}): 1 chiều ${oneway}`;
      if (roundtrip) line += ` | KHỨ HỒI ${roundtrip}`;
      text += line + "\n";
    }

    // Child policy — use first pricing row as reference
    const firstPricing = pricingRows[0];
    if (firstPricing) {
      const freeUnder = firstPricing.childFreeUnder ?? 5;
      const discountUnder = firstPricing.childDiscountUnder ?? 10;
      const discountAmt = firstPricing.childDiscountAmount;
      let childPolicy = `  Trẻ em: <${freeUnder} tuổi miễn phí`;
      if (discountAmt) {
        childPolicy += `, ${freeUnder}-${discountUnder} giảm ${fmt(discountAmt)}`;
      }
      childPolicy += `, >${discountUnder} giá người lớn`;
      text += childPolicy + "\n";
    }

    // Cross-province surcharges — use first pricing row
    if (firstPricing) {
      const surcharges = (firstPricing.crossProvinceSurcharges as Array<{ province: string; surcharge: number }>) ?? [];
      if (surcharges.length > 0) {
        const parts = surcharges.map((s) => `${s.province} +${fmt(s.surcharge)}/ng/chiều`);
        text += `  Phụ thu: ${parts.join(", ")}\n`;
      }
    }

    if (provider.notes) {
      text += `  Ghi chú: ${provider.notes}\n`;
    }
  }

  return text;
}

// ─── Combo Price Formatter ────────────────────────────────────────────────────

/**
 * Calculate combo price and format as Vietnamese text for AI.
 * Uses listed prices only (role="user").
 */
export async function fetchFormattedCombo(
  input: ComboCalculateRequest,
  userRole: string = "user",
): Promise<string> {
  try {
    const result = await calculateCombo(input, userRole);

    const numNights = input.numNights;
    const comboLabel =
      numNights === 1 ? "2N1Đ" : numNights === 2 ? "3N2Đ" : `${numNights} đêm`;
    const numPeople = result.input.numPeople;

    const isAdmin = userRole === "admin";
    const tripLabel = input.tripType === "oneway" ? "1 chiều" : "khứ hồi";
    const dayLabel = input.dayTypes?.length
      ? input.dayTypes.join(", ")
      : input.dayType ?? "weekday";

    let text = `[BÁO GIÁ COMBO — ${numPeople} người, ${comboLabel}, ${tripLabel}]\n`;
    text += `Thị trường: ${input.marketSlug}`;
    if (input.propertySlug) text += ` | Cơ sở: ${input.propertySlug}`;
    text += ` | Loại ngày: ${dayLabel}`;
    if (input.departureProvince) text += ` | Khởi hành: ${input.departureProvince}`;
    if (isAdmin) text += ` | Vai trò: ADMIN (hiển thị giá gốc)`;
    text += "\n";

    // Rooms
    if (result.rooms.length > 0) {
      text += "\nPHÒNG:\n";
      for (const r of result.rooms) {
        const qty = r.quantity > 1 ? `${r.quantity}x ` : "";
        text += `  ${qty}${r.roomType} (${r.guestsPerRoom} ng): ${fmtVnd(r.pricePerRoom)}/phòng`;
        if (isAdmin && r.discountPricePerRoom != null) {
          text += ` (gốc: ${fmtVnd(r.discountPricePerRoom)})`;
        }
        if (r.quantity > 1) text += ` × ${r.quantity} = ${fmtVnd(r.totalRoomCost)}`;
        if (isAdmin && r.totalDiscountCost != null && r.quantity > 1) {
          text += ` (gốc: ${fmtVnd(r.totalDiscountCost)})`;
        }
        text += "\n";
      }
      const totalRooms = result.rooms.reduce((s, r) => s + r.totalRoomCost, 0);
      const totalDiscount = result.rooms.reduce((s, r) => s + (r.totalDiscountCost ?? 0), 0);
      text += `  Tổng phòng: ${fmtVnd(totalRooms)}`;
      if (isAdmin && totalDiscount > 0) text += ` (gốc: ${fmtVnd(totalDiscount)})`;
      text += "\n";
    } else {
      text += "\nPHÒNG: (Không tìm thấy phòng phù hợp)\n";
    }

    // Transport (bus)
    if (result.transport) {
      const t = result.transport;
      text += `\nVẬN CHUYỂN (${t.vehicleClass} ${tripLabel}):\n`;
      if (t.childFreeCount > 0) {
        text += `  ${t.childFreeCount} trẻ <5t: miễn phí\n`;
      }
      if (t.childDiscountCount > 0) {
        text += `  ${t.childDiscountCount} trẻ 5-10t: giảm giá\n`;
      }
      const payingAdults = t.totalPeople - t.childFreeCount;
      text += `  ${payingAdults} ng × ${fmtVnd(t.pricePerPerson)}`;
      if (isAdmin && t.discountPerPerson != null) text += ` (gốc: ${fmtVnd(t.discountPerPerson)})`;
      text += ` = ${fmtVnd(t.totalCost)}`;
      if (isAdmin && t.totalDiscountCost != null) text += ` (gốc: ${fmtVnd(t.totalDiscountCost)})`;
      text += "\n";
    }

    // Ferry
    if (result.ferry) {
      const f = result.ferry;
      text += `\nTÀU/FERRY (${f.vehicleClass} ${tripLabel}):\n`;
      const payingFerry = f.totalPeople - f.childFreeCount;
      text += `  ${payingFerry} ng × ${fmtVnd(f.pricePerPerson)}`;
      if (isAdmin && f.discountPerPerson != null) text += ` (gốc: ${fmtVnd(f.discountPerPerson)})`;
      text += ` = ${fmtVnd(f.totalCost)}`;
      if (isAdmin && f.totalDiscountCost != null) text += ` (gốc: ${fmtVnd(f.totalDiscountCost)})`;
      text += "\n";
    }

    // Summary
    text += `\nTỔNG (giá bán): ${fmtVnd(result.subtotal)}\n`;
    if (isAdmin && result.discountSubtotal != null) {
      text += `TỔNG (giá gốc): ${fmtVnd(result.discountSubtotal)}\n`;
    }
    if (result.profitMarginPercent > 0) {
      text += `Biên lợi nhuận (${result.profitMarginPercent}%): +${fmtVnd(result.marginAmount)}\n`;
    }
    text += `TỔNG SAU MARGIN: ${fmtVnd(result.grandTotal)}`;
    if (isAdmin && result.discountGrandTotal != null) {
      text += ` (gốc: ${fmtVnd(result.discountGrandTotal)})`;
    }
    text += "\n";
    text += `GIÁ/NGƯỜI: ${fmtVnd(result.perPerson)}`;
    if (isAdmin && result.discountPerPerson != null) {
      text += ` (gốc: ${fmtVnd(result.discountPerPerson)})`;
    }
    text += "\n";

    return text;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lỗi tính giá combo";
    return `[BÁO GIÁ COMBO]\nLỗi: ${msg}\n`;
  }
}
