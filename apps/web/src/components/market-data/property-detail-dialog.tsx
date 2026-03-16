import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PropertyRoomsEditor } from "@/components/market-data/property-rooms-editor";
import { ImageManager } from "@/components/market-data/image-manager";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { MarketProperty } from "@app/shared";

interface PropertyDetailDialogProps {
  property: MarketProperty;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin?: boolean;
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "secondary"> = {
  active: "success", inactive: "danger",
};

const INVOICE_LABELS: Record<string, string> = {
  none: "Chưa có", invoice: "Hóa đơn", vat_invoice: "VAT",
  business_registration: "ĐKKD", in_progress: "Đang xử lý",
};

/** Property detail dialog with info display + rooms/pricing management. */
export function PropertyDetailDialog({ property, open, onOpenChange, isAdmin = false }: PropertyDetailDialogProps) {
  const queryClient = useQueryClient();
  // Local state for optimistic image updates — syncs from prop on open/change
  const [localImages, setLocalImages] = useState<string[]>((property.images as string[]) ?? []);
  useEffect(() => { setLocalImages((property.images as string[]) ?? []); }, [property.id, property.images]);

  const updateImagesMutation = useMutation({
    mutationFn: async (newImages: string[]) => {
      setLocalImages(newImages); // Optimistic update immediately
      await apiClient.patch(`/markets/${property.marketId}/properties/${property.id}`, { images: newImages });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["properties", property.marketId] }),
    onError: () => setLocalImages((property.images as string[]) ?? []), // Rollback on error
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {property.name}
            <Badge variant={STATUS_VARIANT[property.status] ?? "secondary"}>{property.status}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Basic info grid */}
        <div className="grid grid-cols-3 gap-x-6 gap-y-3 text-sm border-b border-[var(--border)] pb-4">
          <div>
            <p className="text-[var(--muted-foreground)] text-xs">Loại</p>
            <p className="font-medium">{property.type}</p>
          </div>
          <div>
            <p className="text-[var(--muted-foreground)] text-xs">Xếp hạng</p>
            <p className="font-medium">{property.starRating ? `${property.starRating}★` : "—"}</p>
          </div>
          <div>
            <p className="text-[var(--muted-foreground)] text-xs">Hóa đơn</p>
            <p className="font-medium">{INVOICE_LABELS[property.invoiceStatus] ?? property.invoiceStatus}</p>
          </div>
          {property.address && (
            <div className="col-span-3">
              <p className="text-[var(--muted-foreground)] text-xs">Địa chỉ</p>
              <p>{property.address}</p>
            </div>
          )}
          {property.locationDetail && (
            <div className="col-span-3">
              <p className="text-[var(--muted-foreground)] text-xs">Vị trí chi tiết</p>
              <p>{property.locationDetail}</p>
            </div>
          )}
          {property.description && (
            <div className="col-span-3">
              <p className="text-[var(--muted-foreground)] text-xs">Mô tả</p>
              <p className="whitespace-pre-line">{property.description}</p>
            </div>
          )}
          {property.notes && (
            <div className="col-span-3">
              <p className="text-[var(--muted-foreground)] text-xs">Ghi chú nội bộ</p>
              <p className="italic text-[var(--muted-foreground)]">{property.notes}</p>
            </div>
          )}
        </div>

        {/* Images */}
        <div className="mt-2 border-b border-[var(--border)] pb-4">
          <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Hình ảnh</h3>
          <ImageManager
            images={localImages}
            onChange={(newImages) => updateImagesMutation.mutate(newImages)}
            disabled={!isAdmin}
          />
        </div>

        {/* Rooms & Pricing — full CRUD */}
        <div className="mt-2">
          <PropertyRoomsEditor propertyId={property.id} isAdmin={isAdmin} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
