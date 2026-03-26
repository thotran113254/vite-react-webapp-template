import type { ComboCalculationResult } from "@app/shared";

import { fmtVnd } from "@/lib/format-currency";

const DAY_TYPE_LABELS: Record<string, string> = {
  weekday: "T2-T5", friday: "T6", saturday: "T7", sunday: "CN", holiday: "Ngày lễ",
};

interface Props {
  result: ComboCalculationResult;
  isAdmin: boolean;
}

/** Displays the combo price calculation result in a structured card. */
export function ComboResultCard({ result, isAdmin }: Props) {
  const { input, rooms, transport, ferry, subtotal, profitMarginPercent, marginAmount, grandTotal, perPerson,
    discountSubtotal, discountGrandTotal, discountPerPerson } = result;

  const dayLabel = DAY_TYPE_LABELS[input.dayType] ?? input.dayType;
  const nightLabel = `${input.numNights + 1}N${input.numNights}Đ`;

  return (
    <div className="border border-[var(--border)] rounded-lg bg-[var(--card)] overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 px-4 py-3 text-white">
        <p className="font-semibold">{input.numPeople} người · {nightLabel} · {dayLabel}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Rooms section */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">PHÒNG</p>
          <div className="space-y-2">
            {rooms.map((r, i) => (
              <div key={i} className="flex flex-col gap-0.5 rounded bg-[var(--muted)]/30 px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{r.propertyName} – {r.roomType}</span>
                  <span className="font-semibold">{fmtVnd(r.totalRoomCost)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                  <span>{r.quantity} phòng × {r.guestsPerRoom} người · {fmtVnd(r.pricePerRoom)}/phòng</span>
                  {r.roomCode && <span className="text-[10px]">[{r.roomCode}]</span>}
                </div>
                {isAdmin && r.discountPricePerRoom != null && (
                  <div className="flex items-center justify-between text-xs text-orange-500 mt-0.5">
                    <span>CK: {fmtVnd(r.discountPricePerRoom)}/phòng</span>
                    {r.totalDiscountCost != null && <span className="font-semibold">{fmtVnd(r.totalDiscountCost)}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Transport section */}
        {transport && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">VẬN CHUYỂN</p>
            <div className="rounded bg-[var(--muted)]/30 px-3 py-2 text-sm space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="font-medium">{transport.providerName} – {transport.vehicleClass}</span>
                <span className="font-semibold">{fmtVnd(transport.totalCost)}</span>
              </div>
              <div className="text-xs text-[var(--muted-foreground)]">
                {transport.totalPeople} người · {fmtVnd(transport.pricePerPerson)}/người · {transport.seatType}
              </div>
              {(transport.childFreeCount > 0 || transport.childDiscountCount > 0) && (
                <div className="text-xs text-[var(--muted-foreground)]">
                  Miễn phí: {transport.childFreeCount} · Giảm giá: {transport.childDiscountCount}
                </div>
              )}
              {isAdmin && transport.discountPerPerson != null && (
                <div className="flex items-center justify-between text-xs text-orange-500 mt-0.5">
                  <span>CK: {fmtVnd(transport.discountPerPerson)}/người</span>
                  {transport.totalDiscountCost != null && <span className="font-semibold">{fmtVnd(transport.totalDiscountCost)}</span>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ferry section */}
        {ferry && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">TÀU</p>
            <div className="rounded bg-[var(--muted)]/30 px-3 py-2 text-sm space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="font-medium">{ferry.providerName} – {ferry.vehicleClass}</span>
                <span className="font-semibold">{fmtVnd(ferry.totalCost)}</span>
              </div>
              <div className="text-xs text-[var(--muted-foreground)]">
                {ferry.totalPeople} người · {fmtVnd(ferry.pricePerPerson)}/người · {ferry.seatType}
              </div>
              {(ferry.childFreeCount > 0 || ferry.childDiscountCount > 0) && (
                <div className="text-xs text-[var(--muted-foreground)]">
                  Miễn phí: {ferry.childFreeCount} · Giảm giá: {ferry.childDiscountCount}
                </div>
              )}
              {isAdmin && ferry.discountPerPerson != null && (
                <div className="flex items-center justify-between text-xs text-orange-500 mt-0.5">
                  <span>CK: {fmtVnd(ferry.discountPerPerson)}/người</span>
                  {ferry.totalDiscountCost != null && <span className="font-semibold">{fmtVnd(ferry.totalDiscountCost)}</span>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="border-t border-[var(--border)] pt-3 space-y-1.5 text-sm">
          <div className="flex items-center justify-between text-[var(--muted-foreground)]">
            <span>Tạm tính</span>
            <span>{fmtVnd(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-[var(--muted-foreground)]">
            <span>Margin ({profitMarginPercent}%)</span>
            <span>{fmtVnd(marginAmount)}</span>
          </div>
          <div className="flex items-center justify-between font-semibold text-base border-t border-[var(--border)] pt-2">
            <span>Tổng cộng</span>
            <span className="text-blue-700">{fmtVnd(grandTotal)}</span>
          </div>
          {isAdmin && discountSubtotal != null && (
            <div className="flex items-center justify-between text-orange-500 text-xs">
              <span>Tổng CK</span>
              <span>{fmtVnd(discountGrandTotal ?? 0)}</span>
            </div>
          )}
        </div>

        {/* Per person highlight */}
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 text-center">
          <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Giá mỗi người</p>
          <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{fmtVnd(perPerson)}</p>
          {isAdmin && discountPerPerson != null && (
            <p className="text-sm text-orange-500 mt-1">CK: {fmtVnd(discountPerPerson)}/người</p>
          )}
        </div>
      </div>
    </div>
  );
}
