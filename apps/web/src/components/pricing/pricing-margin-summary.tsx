import type { RoomPricing } from "@app/shared";

interface RoomWithPricing {
  roomType: string;
  pricings: RoomPricing[];
}

interface PricingMarginSummaryProps {
  rooms: RoomWithPricing[];
}

function avgMargin(pricings: RoomPricing[]): number | null {
  const valid = pricings.filter((p) => p.discountPrice != null && p.price > 0);
  if (!valid.length) return null;
  const sum = valid.reduce((acc, p) => acc + ((p.price - p.discountPrice!) / p.price) * 100, 0);
  return Math.round(sum / valid.length);
}

function MarginCell({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-[var(--muted-foreground)]">—</span>;
  const cls = pct > 20 ? "text-green-600 font-semibold" : pct >= 10 ? "text-yellow-600 font-semibold" : "text-red-600 font-semibold";
  return <span className={cls}>{pct}%</span>;
}

export function PricingMarginSummary({ rooms }: PricingMarginSummaryProps) {
  if (!rooms.length) return null;

  const margins = rooms
    .map((r) => ({ room: r.roomType, margin: avgMargin(r.pricings) }))
    .filter((r) => r.margin != null) as { room: string; margin: number }[];

  if (!margins.length) return null;

  const overall = Math.round(margins.reduce((s, r) => s + r.margin, 0) / margins.length);
  const maxRoom = margins.reduce((a, b) => a.margin >= b.margin ? a : b);
  const minRoom = margins.reduce((a, b) => a.margin <= b.margin ? a : b);

  return (
    <div className="space-y-2">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg border border-[var(--border)] px-3 py-2">
          <p className="text-[var(--muted-foreground)] mb-0.5">Biên LN trung bình</p>
          <p className={`text-sm font-bold ${overall > 20 ? "text-green-600" : overall >= 10 ? "text-yellow-600" : "text-red-600"}`}>
            {overall}%
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] px-3 py-2">
          <p className="text-[var(--muted-foreground)] mb-0.5">Cao nhất</p>
          <p className="text-sm font-bold text-green-600">{maxRoom.room} ({maxRoom.margin}%)</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] px-3 py-2">
          <p className="text-[var(--muted-foreground)] mb-0.5">Thấp nhất</p>
          <p className="text-sm font-bold text-red-600">{minRoom.room} ({minRoom.margin}%)</p>
        </div>
      </div>

      {/* Per-room table */}
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="text-left p-1.5 text-[var(--muted-foreground)] font-medium">Phòng</th>
            <th className="text-right p-1.5 text-[var(--muted-foreground)] font-medium">Biên LN TB</th>
          </tr>
        </thead>
        <tbody>
          {margins.map(({ room, margin }) => (
            <tr key={room} className="border-b border-[var(--border)]/40">
              <td className="p-1.5">{room}</td>
              <td className="p-1.5 text-right"><MarginCell pct={margin} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
