import { Plane, Hotel, Utensils, Map, Bus, Activity, MapPin, ExternalLink, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ItineraryItem, ItineraryItemType } from "@app/shared";

const TYPE_CONFIG: Record<
  ItineraryItemType,
  { icon: React.ElementType; label: string; color: string }
> = {
  flight:     { icon: Plane,     label: "KHỞI HÀNH",   color: "text-blue-600 bg-blue-50 border-blue-200" },
  hotel:      { icon: Hotel,     label: "NHẬN PHÒNG",   color: "text-teal-600 bg-teal-50 border-teal-200" },
  restaurant: { icon: Utensils,  label: "ĐẶT BÀN",     color: "text-orange-600 bg-orange-50 border-orange-200" },
  tour:       { icon: Map,       label: "THAM QUAN",    color: "text-purple-600 bg-purple-50 border-purple-200" },
  transport:  { icon: Bus,       label: "DI CHUYỂN",    color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  activity:   { icon: Activity,  label: "HOẠT ĐỘNG",   color: "text-rose-600 bg-rose-50 border-rose-200" },
};

function formatTime(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  if (h === undefined || m === undefined) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

interface Props {
  item: ItineraryItem;
  isLast: boolean;
}

/** Single timeline entry showing time, type badge, and activity card. */
export function ItineraryTimelineItem({ item, isLast }: Props) {
  const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.activity;
  const Icon = config.icon;

  const imageUrl = typeof item.metadata?.imageUrl === "string" ? item.metadata.imageUrl : null;
  const phone    = typeof item.metadata?.phone === "string"    ? item.metadata.phone    : null;
  const website  = typeof item.metadata?.website === "string"  ? item.metadata.website  : null;
  const mapUrl   = item.location
    ? `https://maps.google.com/?q=${encodeURIComponent(item.location)}`
    : null;

  return (
    <div className="flex gap-4">
      {/* Left: time + connector */}
      <div className="flex flex-col items-center">
        <span className="w-20 shrink-0 text-right text-sm font-semibold text-[var(--foreground)]">
          {formatTime(item.startTime)}
        </span>
        <div className="mt-2 flex flex-col items-center">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-full border-2", config.color)}>
            <Icon className="h-4 w-4" />
          </div>
          {!isLast && <div className="mt-1 w-0.5 flex-1 bg-[var(--border)] min-h-[40px]" />}
        </div>
      </div>

      {/* Right: type label + card */}
      <div className="flex-1 pb-6">
        <span className={cn("mb-2 inline-block rounded px-2 py-0.5 text-xs font-bold tracking-wide border", config.color)}>
          {config.label}
        </span>

        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={item.title}
              className="h-36 w-full object-cover"
              loading="lazy"
            />
          )}

          <div className="p-4">
            <h4 className="font-semibold text-[var(--foreground)]">{item.title}</h4>
            {item.subtitle && (
              <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">{item.subtitle}</p>
            )}
            {item.location && (
              <div className="mt-1.5 flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>{item.location}</span>
              </div>
            )}
            {item.confirmationCode && (
              <p className="mt-1.5 text-xs text-[var(--muted-foreground)]">
                Mã xác nhận:{" "}
                <span className="font-mono font-semibold text-teal-700">{item.confirmationCode}</span>
              </p>
            )}
            {item.notes && (
              <p className="mt-1.5 text-xs italic text-[var(--muted-foreground)]">{item.notes}</p>
            )}

            {/* Action links */}
            {(website || mapUrl || phone) && (
              <div className="mt-3 flex flex-wrap gap-3 border-t border-[var(--border)] pt-3">
                {website && (
                  <a
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Xem chi tiết
                  </a>
                )}
                {mapUrl && (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:underline"
                  >
                    <MapPin className="h-3.5 w-3.5" /> Chỉ đường
                  </a>
                )}
                {phone && (
                  <a
                    href={`tel:${phone}`}
                    className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5" /> Gọi điện
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
