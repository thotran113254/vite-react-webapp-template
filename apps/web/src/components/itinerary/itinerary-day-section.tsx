import { ItineraryTimelineItem } from "./itinerary-timeline-item";
import type { ItineraryItem } from "@app/shared";

const WEEKDAY_VI = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const MONTH_VI = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

function formatDayHeader(startDate: string, dayNumber: number): string {
  const base = new Date(startDate);
  base.setDate(base.getDate() + dayNumber - 1);
  const wd = WEEKDAY_VI[base.getDay()] ?? "";
  const month = MONTH_VI[base.getMonth()] ?? "";
  return `${wd}, ${base.getDate()} ${month}`;
}

interface Props {
  dayNumber: number;
  items: ItineraryItem[];
  tripStartDate: string;
}

/** One day block with a header and vertical timeline of activities. */
export function ItineraryDaySection({ dayNumber, items, tripStartDate }: Props) {
  const sortedItems = [...items].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.startTime.localeCompare(b.startTime),
  );

  return (
    <section>
      {/* Day header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
          {dayNumber}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
            Ngày {dayNumber}
          </p>
          <h3 className="text-base font-semibold text-[var(--foreground)]">
            {formatDayHeader(tripStartDate, dayNumber)}
          </h3>
        </div>
      </div>

      {/* Timeline items */}
      <div className="ml-4 pl-4 border-l-0">
        {sortedItems.length > 0 ? (
          sortedItems.map((item, idx) => (
            <ItineraryTimelineItem
              key={item.id}
              item={item}
              isLast={idx === sortedItems.length - 1}
            />
          ))
        ) : (
          <p className="text-sm text-[var(--muted-foreground)] pb-4">
            Chưa có hoạt động nào trong ngày này.
          </p>
        )}
      </div>
    </section>
  );
}
