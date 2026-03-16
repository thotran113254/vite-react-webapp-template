import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AiVisibilityToggle } from "@/components/market-data/ai-visibility-toggle";
import { ImageManager, ImageThumbnail } from "@/components/market-data/image-manager";
import { Spinner } from "@/components/ui/spinner";
import { apiClient } from "@/lib/api-client";
import type { PropertyRoom, RoomPricing } from "@app/shared";
import { PricingTable } from "@/components/market-data/room-pricing-table";

interface Props {
  propertyId: string;
  isAdmin: boolean;
}

type RoomForm = { roomType: string; bookingCode: string; capacity: string; description: string; sortOrder: string; images: string[] };
const EMPTY_ROOM: RoomForm = { roomType: "", bookingCode: "", capacity: "2", description: "", sortOrder: "0", images: [] };

/** Property rooms editor with expandable pricing per room. */
export function PropertyRoomsEditor({ propertyId, isAdmin }: Props) {
  const queryClient = useQueryClient();
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [roomDialog, setRoomDialog] = useState(false);
  const [editRoom, setEditRoom] = useState<PropertyRoom | null>(null);
  const [form, setForm] = useState<RoomForm>(EMPTY_ROOM);
  const [deleteTarget, setDeleteTarget] = useState<PropertyRoom | null>(null);

  const qk = ["property-rooms", propertyId];
  const { data, isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => {
      const res = await apiClient.get<{ data: PropertyRoom[] }>(`/properties/${propertyId}/rooms`);
      return (res.data.data ?? []).sort((a, b) => a.sortOrder - b.sortOrder);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { roomType: form.roomType, bookingCode: form.bookingCode || null, capacity: Number(form.capacity), description: form.description || null, sortOrder: Number(form.sortOrder), images: form.images };
      if (editRoom) { await apiClient.patch(`/properties/${propertyId}/rooms/${editRoom.id}`, payload); }
      else { await apiClient.post(`/properties/${propertyId}/rooms`, payload); }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qk }); setRoomDialog(false); },
  });

  const updateRoomImagesMutation = useMutation({
    mutationFn: async ({ roomId, images }: { roomId: string; images: string[] }) => {
      await apiClient.patch(`/properties/${propertyId}/rooms/${roomId}`, { images });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/properties/${propertyId}/rooms/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qk }); setDeleteTarget(null); },
  });

  const openAdd = () => { setEditRoom(null); setForm(EMPTY_ROOM); setRoomDialog(true); };
  const openEdit = (r: PropertyRoom) => {
    setEditRoom(r);
    setForm({ roomType: r.roomType, bookingCode: r.bookingCode ?? "", capacity: String(r.capacity), description: r.description ?? "", sortOrder: String(r.sortOrder), images: (r.images as string[]) ?? [] });
    setRoomDialog(true);
  };

  const rooms = data ?? [];
  if (isLoading) return <div className="flex justify-center py-4"><Spinner size="sm" /></div>;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Phòng & Bảng giá</h3>
        {isAdmin && <Button size="sm" className="bg-teal-600 hover:bg-teal-700 h-7 text-xs" onClick={openAdd}><Plus className="mr-1 h-3 w-3" /> Thêm phòng</Button>}
      </div>

      {rooms.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">Chưa có phòng nào</p>}

      {rooms.map((room) => {
        const expanded = expandedRoom === room.id;
        const roomImages = (room.images as string[]) ?? [];
        return (
          <div key={room.id} className="border border-[var(--border)] rounded-md">
            <div className="flex items-center gap-2 px-3 py-2 group">
              <button className="shrink-0" onClick={() => setExpandedRoom(expanded ? null : room.id)}>
                {expanded ? <ChevronDown className="h-4 w-4 text-[var(--muted-foreground)]" /> : <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" />}
              </button>
              <ImageThumbnail src={roomImages[0]} alt={room.roomType} size={32} />
              <span className="flex-1 text-sm font-medium text-[var(--foreground)]">{room.roomType}</span>
              {room.bookingCode && <span className="text-xs font-mono text-[var(--muted-foreground)]">{room.bookingCode}</span>}
              {roomImages.length > 0 && (
                <span className="text-xs text-[var(--muted-foreground)] flex items-center gap-0.5">
                  <ImageIcon className="h-3 w-3" />{roomImages.length}
                </span>
              )}
              <span className="text-xs text-[var(--muted-foreground)]">{room.capacity} người</span>
              <AiVisibilityToggle entityType="room" entityId={room.id} enabled={room.aiVisible} invalidateKeys={[qk]} />
              {isAdmin && (
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEdit(room)}><Pencil className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400 hover:text-red-600" onClick={() => setDeleteTarget(room)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              )}
            </div>
            {expanded && (
              <div className="border-t border-[var(--border)] px-3 pb-3 pt-2 space-y-3">
                {room.description && <p className="text-xs text-[var(--muted-foreground)] mb-2">{room.description}</p>}
                <div>
                  <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Hình ảnh phòng</p>
                  <ImageManager
                    images={roomImages}
                    onChange={(newImages) => updateRoomImagesMutation.mutate({ roomId: room.id, images: newImages })}
                    disabled={!isAdmin}
                    maxImages={10}
                  />
                </div>
                <PricingTable room={room} isAdmin={isAdmin} />
              </div>
            )}
          </div>
        );
      })}

      {/* Room add/edit dialog */}
      <Dialog open={roomDialog} onOpenChange={setRoomDialog}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editRoom ? "Sửa phòng" : "Thêm phòng"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-col gap-1"><label className="text-sm font-medium">Loại phòng *</label><Input value={form.roomType} onChange={(e) => setForm((f) => ({ ...f, roomType: e.target.value }))} placeholder="VD: Phòng Đôi View Biển" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1"><label className="text-sm font-medium">Mã đặt phòng</label><Input value={form.bookingCode} onChange={(e) => setForm((f) => ({ ...f, bookingCode: e.target.value }))} placeholder="SR01" /></div>
              <div className="flex flex-col gap-1"><label className="text-sm font-medium">Sức chứa</label><Input type="number" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} /></div>
              <div className="flex flex-col gap-1"><label className="text-sm font-medium">Thứ tự</label><Input type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} /></div>
            </div>
            <div className="flex flex-col gap-1"><label className="text-sm font-medium">Mô tả</label><Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Hình ảnh phòng</label>
              <ImageManager images={form.images} onChange={(imgs) => setForm((f) => ({ ...f, images: imgs }))} maxImages={10} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoomDialog(false)}>Hủy</Button>
            <Button className="bg-teal-600 hover:bg-teal-700" disabled={saveMutation.isPending || !form.roomType} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete room confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Xóa phòng"
        description={`Bạn có chắc muốn xóa "${deleteTarget?.roomType}"? Toàn bộ bảng giá và hình ảnh của phòng cũng sẽ bị xóa.`}
        confirmLabel="Xóa"
        variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
