import { Heart, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Hotel } from "@app/shared";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=250&fit=crop";

interface HotelCardProps {
  hotel: Hotel;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < rating ? "fill-blue-500 text-blue-500" : "fill-none text-gray-300"
          )}
        />
      ))}
    </div>
  );
}

/** Hotel card with image, rating, price, amenity tags, and detail link. */
export function HotelCard({ hotel }: HotelCardProps) {
  const image = hotel.images?.[0] ?? FALLBACK_IMAGE;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={image}
          alt={hotel.name}
          className="h-full w-full object-cover transition-transform hover:scale-105"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE; }}
        />
        <button
          className="absolute right-2 top-2 rounded-full bg-white/80 p-1.5 text-gray-600 backdrop-blur-sm transition-colors hover:bg-white hover:text-red-500"
          aria-label="Lưu khách sạn"
        >
          <Heart className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <CardContent className="p-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 font-semibold text-[var(--foreground)]">{hotel.name}</h3>
        </div>

        <StarRating rating={hotel.starRating ?? 0} />

        <p className="mt-1 line-clamp-1 text-xs text-[var(--muted-foreground)]">{hotel.location}</p>

        {/* Price */}
        <p className="mt-2 text-lg font-bold text-blue-600">
          ${hotel.priceFrom ?? 0}
          <span className="ml-1 text-sm font-normal text-[var(--muted-foreground)]">/ đêm</span>
        </p>

        {/* Amenity tags */}
        {hotel.amenities && hotel.amenities.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {hotel.amenities.slice(0, 3).map((amenity) => (
              <Badge key={amenity} variant="secondary" className="text-xs">
                {amenity}
              </Badge>
            ))}
          </div>
        )}

        {/* CTA */}
        <Link to={`/hotels/${hotel.slug}`} className="mt-3 block">
          <Button
            size="sm"
            className="w-full bg-blue-600 text-white hover:bg-blue-700"
          >
            View Details
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
