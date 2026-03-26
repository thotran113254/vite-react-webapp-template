import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, DoorOpen, Plus, Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { PricingPriceMatrix } from "@/components/pricing/pricing-price-matrix";
import { PricingMarginSummary } from "@/components/pricing/pricing-margin-summary";
import { RoomFormDialog, EMPTY_ROOM, type RoomForm } from "@/components/market-data/room-form-dialog";
import { apiClient } from "@/lib/api-client";
import type { MarketProperty, PropertyRoom, RoomPricing } from "@app/shared";

const SEARCH_THRESHOLD = 6;

/** Fetch pricings for all rooms in a property (parallel queries). */
function usePropertyPricings(rooms: PropertyRoom[]) {
  return useQuery({
    queryKey: ["property-pricings-bulk", rooms.map((r) => r.id).join(",")],
    enabled: rooms.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        rooms.map(async (room) => {
          const res = await apiClient.get<{ data: RoomPricing[] }>(`/rooms/${room.id}/pricing`);
          return { roomId: room.id, roomType: room.roomType, pricings: res.data.data ?? [] };
        }),
      );
      return results;
    },
    staleTime: 30 * 1000,
  });
}

/** Room pricing overview: property pills + add room + flat room list with price matrices. */
export function PricingRoomOverviewTab({ marketId, isAdmin }: { marketId: string; isAdmin: boolean }) {
  const qc = useQueryClient();
  const [propertyId, setPropertyId] = useState("");
  const [search, setSearch] = useState("");
  const [roomDialog, setRoomDialog] = useState(false);
  const [roomForm, setRoomForm] = useState<RoomForm>(EMPTY_ROOM);
  const [showMargin, setShowMargin] = useState(false);

  const { data: properties = [], isLoading: propsLoading } = useQuery({
    queryKey: ["market-properties", marketId],
    enabled: !!marketId,
    queryFn: async () => {
      const res = await apiClient.get<{ data: MarketProperty[] }>(`/markets/${marketId}/properties`);
      return res.data.data ?? [];
    },
  });

  useEffect(() => {
    if (properties.length > 0 && !propertyId) setPropertyId(properties[0]!.id);
  }, [properties, propertyId]);

  useEffect(() => { setPropertyId(""); }, [marketId]);

  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ["property-rooms", propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const res = await apiClient.get<{ data: PropertyRoom[] }>(`/properties/${propertyId}/rooms`);
      return (res.data.data ?? []).sort((a, b) => a.sortOrder - b.sortOrder);
    },
  });

  const { data: roomPricings = [] } = usePropertyPricings(isAdmin ? rooms : []);

  const addRoomMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/properties/${propertyId}/rooms`, {
        roomType: roomForm.roomType, bookingCode: roomForm.bookingCode || null,
        capacity: Number(roomForm.capacity), description: roomForm.description || null,
        sortOrder: Number(roomForm.sortOrder),
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["property-rooms", propertyId] }); setRoomDialog(false); },
  });

  const showSearch = properties.length >= SEARCH_THRESHOLD;
  const filtered = useMemo(() => {
    if (!search.trim()) return properties;
    const q = search.toLowerCase();
    return properties.filter((p) => p.name.toLowerCase().includes(q));
  }, [properties, search]);

  if (propsLoading) return <div className="flex justify-center py-8"><Spinner /></div>;
  if (properties.length === 0) return <p className="text-sm text-[var(--muted-foreground)] text-center py-8">Chưa có cơ sở lưu trú.</p>;

  return (
    <div className="space-y-4">
      {/* Search */}
      {showSearch && (
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted-foreground)]" />
          <Input className="pl-8 h-8 text-sm" placeholder={`Tìm trong ${properties.length} cơ sở...`}
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      )}

      {/* Property pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
        {filtered.map((p) => {
          const active = p.id === propertyId;
          return (
            <button key={p.id} onClick={() => setPropertyId(p.id)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                active
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-blue-400 hover:text-blue-700 dark:hover:text-blue-400"
              }`}>
              {p.name}
              {p.starRating && <span className="ml-1 text-xs opacity-70">{p.starRating}★</span>}
            </button>
          );
        })}
        {showSearch && filtered.length === 0 && (
          <span className="text-xs text-[var(--muted-foreground)]">Không tìm thấy</span>
        )}
      </div>

      {/* Margin summary (admin only, collapsible) */}
      {isAdmin && roomPricings.length > 0 && (
        <div className="border border-[var(--border)] rounded-lg overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider hover:bg-[var(--muted)]/30 transition-colors"
            onClick={() => setShowMargin((v) => !v)}
          >
            <span>Phân tích biên lợi nhuận</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showMargin ? "rotate-180" : ""}`} />
          </button>
          {showMargin && (
            <div className="px-3 pb-3">
              <PricingMarginSummary rooms={roomPricings} />
            </div>
          )}
        </div>
      )}

      {/* Room list header with Add button */}
      {propertyId && !roomsLoading && (
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-[var(--muted-foreground)]">{rooms.length} phòng</p>
          {isAdmin && (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-7 text-xs"
              onClick={() => { setRoomForm(EMPTY_ROOM); setRoomDialog(true); }}>
              <Plus className="mr-1 h-3 w-3" /> Thêm phòng
            </Button>
          )}
        </div>
      )}

      {propertyId && roomsLoading && <div className="flex justify-center py-6"><Spinner /></div>}

      {propertyId && !roomsLoading && rooms.length === 0 && (
        <p className="text-sm text-[var(--muted-foreground)] text-center py-6">Chưa có phòng nào.</p>
      )}

      {/* All rooms flat with price matrices */}
      {rooms.map((room) => (
        <div key={room.id} className="border border-[var(--border)] rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <DoorOpen className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="text-sm font-semibold text-[var(--foreground)]">{room.roomType}</span>
            {room.bookingCode && <span className="text-xs font-mono text-[var(--muted-foreground)]">{room.bookingCode}</span>}
            <span className="text-xs text-[var(--muted-foreground)]">{room.capacity} người</span>
          </div>
          <PricingPriceMatrix room={room} isAdmin={isAdmin} />
        </div>
      ))}

      {/* Add room dialog */}
      <RoomFormDialog
        open={roomDialog} onOpenChange={setRoomDialog}
        form={roomForm} setForm={setRoomForm}
        isEditing={false} isSaving={addRoomMutation.isPending}
        onSave={() => addRoomMutation.mutate()}
      />
    </div>
  );
}
