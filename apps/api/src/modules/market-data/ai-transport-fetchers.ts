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

// ─── Vietnamese day type labels ───────────────────────────────────────────────

const DAYTYPE_LABELS: Record<string, string> = {
  weekday: "Ngày thường", friday: "Thứ 6", saturday: "Thứ 7",
  sunday: "Chủ nhật", holiday: "Ngày lễ",
};

function dayTypeToVi(dt: string): string { return DAYTYPE_LABELS[dt] ?? dt; }

function dayTypesLabel(dayTypes: string[] | undefined, dayType: string | undefined): string {
  if (dayTypes?.length) return dayTypes.map(dayTypeToVi).join(" → ");
  return dayTypeToVi(dayType ?? "weekday");
}

// ─── Transport line formatter ────────────────────────────────────────────────

function formatTransportLine(
  t: import("@app/shared").ComboTransportLine,
  label: string,
  tripLabel: string,
  isAdmin: boolean,
): string {
  let text = `\n${label} (${t.providerName} — ${t.vehicleClass}/${t.seatType} ${tripLabel}):\n`;

  // Adult pricing
  text += `  Người lớn: ${t.totalPeople - t.childFreeCount - t.childDiscountCount} ng × ${fmtVnd(t.pricePerPerson)}`;
  if (isAdmin && t.discountPerPerson != null) text += ` (gốc: ${fmtVnd(t.discountPerPerson)})`;
  text += "\n";

  // Child pricing — show actual child price
  if (t.childFreeCount > 0) {
    text += `  Trẻ <5 tuổi: ${t.childFreeCount} bé — MIỄN PHÍ\n`;
  }
  if (t.childDiscountCount > 0) {
    const childPrice = t.childPricePerPerson ?? t.pricePerPerson;
    text += `  Trẻ 5-10 tuổi: ${t.childDiscountCount} bé × ${fmtVnd(childPrice)}/bé\n`;
  }

  // Cross-province surcharge — itemized separately
  if (t.surchargeProvince && t.surchargePerPerson && t.surchargeTotal) {
    const paying = t.totalPeople - t.childFreeCount;
    text += `  Phụ thu liên tỉnh (${t.surchargeProvince}): ${paying} ng × ${fmtVnd(t.surchargePerPerson)} = ${fmtVnd(t.surchargeTotal)}\n`;
  }

  // Total
  text += `  Tổng: ${fmtVnd(t.totalCost)}`;
  if (isAdmin && t.totalDiscountCost != null) text += ` (gốc: ${fmtVnd(t.totalDiscountCost)})`;
  text += "\n";

  return text;
}

// ─── Combo Price Formatter ────────────────────────────────────────────────────

/**
 * Calculate combo price and format as Vietnamese text for AI.
 * Clear output for admin and sales staff.
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
    const dayLabel = dayTypesLabel(input.dayTypes, input.dayType);
    const isMixedDay = (input.dayTypes?.length ?? 0) > 1
      && new Set(input.dayTypes).size > 1;

    // Header
    let text = `[BÁO GIÁ COMBO — ${numPeople} người, ${comboLabel}, ${tripLabel}]\n`;
    text += `Thị trường: ${input.marketSlug}`;
    if (input.propertySlug) text += ` | Cơ sở: ${input.propertySlug}`;
    text += ` | Loại ngày: ${dayLabel}`;
    if (input.departureProvince) text += ` | Khởi hành: ${input.departureProvince}`;
    if (isAdmin) text += ` | ADMIN (hiển thị giá gốc + margin)`;
    text += "\n";

    // Guest breakdown
    const guestParts: string[] = [`${input.numAdults} người lớn`];
    if (input.numChildrenUnder10 > 0) guestParts.push(`${input.numChildrenUnder10} trẻ 5-10t`);
    if (input.numChildrenUnder5 > 0) guestParts.push(`${input.numChildrenUnder5} trẻ <5t`);
    text += `Khách: ${guestParts.join(", ")}\n`;

    // Rooms
    if (result.rooms.length > 0) {
      text += "\n── PHÒNG ──\n";
      for (const r of result.rooms) {
        const qty = r.quantity > 1 ? `${r.quantity}× ` : "";
        const code = r.roomCode ? ` [${r.roomCode}]` : "";
        text += `  ${qty}${r.roomType}${code} (${r.guestsPerRoom} ng/phòng)`;
        if (isMixedDay) {
          // Show total for multi-night mixed-day
          text += `: ${fmtVnd(r.totalRoomCost)}/${numNights} đêm`;
          if (isAdmin && r.totalDiscountCost != null) text += ` (gốc: ${fmtVnd(r.totalDiscountCost)})`;
        } else {
          text += `: ${fmtVnd(r.pricePerRoom)}/phòng`;
          if (isAdmin && r.discountPricePerRoom != null) text += ` (gốc: ${fmtVnd(r.discountPricePerRoom)})`;
          if (numNights > 1) text += ` × ${numNights} đêm`;
          if (r.quantity > 1) text += ` × ${r.quantity} phòng`;
          text += ` = ${fmtVnd(r.totalRoomCost)}`;
          if (isAdmin && r.totalDiscountCost != null) text += ` (gốc: ${fmtVnd(r.totalDiscountCost)})`;
        }
        text += "\n";
      }
      const totalRooms = result.rooms.reduce((s, r) => s + r.totalRoomCost, 0);
      const totalDiscount = result.rooms.reduce((s, r) => s + (r.totalDiscountCost ?? 0), 0);
      text += `  → Tổng phòng: ${fmtVnd(totalRooms)}`;
      if (isAdmin && totalDiscount > 0) text += ` (gốc: ${fmtVnd(totalDiscount)})`;
      text += "\n";
    } else {
      text += "\n── PHÒNG ──\n  (Không tìm thấy phòng phù hợp cho loại ngày đã chọn)\n";
    }

    // Transport (bus) — improved with child & surcharge details
    if (result.transport) {
      text += formatTransportLine(result.transport, "── VẬN CHUYỂN", tripLabel, isAdmin);
    }

    // Ferry — improved
    if (result.ferry) {
      text += formatTransportLine(result.ferry, "── TÀU/FERRY", tripLabel, isAdmin);
    }

    // Summary
    text += "\n── TỔNG KẾT ──\n";
    if (isAdmin && result.discountSubtotal != null) {
      text += `  Giá gốc: ${fmtVnd(result.discountSubtotal)}\n`;
      text += `  Giá bán (trước margin): ${fmtVnd(result.subtotal)}\n`;
      text += `  Biên lợi nhuận (${result.profitMarginPercent}%): +${fmtVnd(result.marginAmount)}\n`;
      text += `  ★ GIÁ BÁN CUỐI: ${fmtVnd(result.grandTotal)}`;
      if (result.discountGrandTotal != null) text += ` (gốc sau margin: ${fmtVnd(result.discountGrandTotal)})`;
      text += "\n";
      text += `  ★ GIÁ/NGƯỜI: ${fmtVnd(result.perPerson)}`;
      if (result.discountPerPerson != null) text += ` (gốc: ${fmtVnd(result.discountPerPerson)})`;
      text += "\n";
    } else {
      text += `  Tổng: ${fmtVnd(result.subtotal)}\n`;
      if (result.profitMarginPercent > 0) {
        text += `  ★ GIÁ BÁN: ${fmtVnd(result.grandTotal)}\n`;
      }
      text += `  ★ GIÁ/NGƯỜI: ${fmtVnd(result.perPerson)}\n`;
    }

    // Warnings
    if (result.warnings?.length) {
      text += `\n⚠ ${result.warnings.join("; ")}\n`;
    }

    return text;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lỗi tính giá combo";
    return `[BÁO GIÁ COMBO]\nLỗi: ${msg}\n`;
  }
}
