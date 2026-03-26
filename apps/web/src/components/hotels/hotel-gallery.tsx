import { useState } from "react";
import { cn } from "@/lib/utils";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=500&fit=crop";

interface HotelGalleryProps {
  images: string[];
  altPrefix?: string;
}

/** Main image with clickable thumbnails below. */
export function HotelGallery({ images, altPrefix = "Hotel" }: HotelGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const displayImages = images.length > 0 ? images : [FALLBACK_IMAGE];
  const mainImage = displayImages[selectedIndex] ?? FALLBACK_IMAGE;

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative h-72 overflow-hidden rounded-xl shadow-md sm:h-96">
        <img
          src={mainImage}
          alt={`${altPrefix} - photo ${selectedIndex + 1}`}
          className="h-full w-full object-cover transition-opacity duration-200"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE; }}
        />
        {displayImages.length > 1 && (
          <div className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2.5 py-1 text-xs text-white backdrop-blur-sm">
            {selectedIndex + 1} / {displayImages.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {displayImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {displayImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIndex(idx)}
              className={cn(
                "h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                selectedIndex === idx
                  ? "border-blue-500 opacity-100"
                  : "border-transparent opacity-60 hover:opacity-90"
              )}
              aria-label={`View photo ${idx + 1}`}
            >
              <img
                src={img}
                alt={`${altPrefix} thumbnail ${idx + 1}`}
                className="h-full w-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE; }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
