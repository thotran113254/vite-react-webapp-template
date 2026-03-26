import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Eye, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD, TableHeaderRow } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AiVisibilityToggle } from "@/components/market-data/ai-visibility-toggle";
import { PropertyDetailDialog } from "@/components/market-data/property-detail-dialog";
import { PropertyCardGrid } from "@/components/market-data/property-card-grid";
import { ImageManager, ImageThumbnail } from "@/components/market-data/image-manager";
import { AmenityTagPicker } from "@/components/market-data/amenity-tag-picker";
import { Spinner } from "@/components/ui/spinner";
import { apiClient } from "@/lib/api-client";
import type { MarketProperty } from "@app/shared";

interface PropertiesTabProps {
  marketId: string;
  isAdmin: boolean;
}

type FormState = {
  name: string;
  propertyCode: string;
  type: string;
  starRating: string;
  address: string;
  locationDetail: string;
  description: string;
  amenities: string[];
  status: string;
  invoiceStatus: string;
  notes: string;
  images: string[];
};

const EMPTY_FORM: FormState = {
  name: "", propertyCode: "", type: "homestay", starRating: "", address: "",
  locationDetail: "", description: "", amenities: [], status: "active", invoiceStatus: "none", notes: "", images: [],
};

const STATUS_VARIANT: Record<string, "success" | "danger" | "secondary"> = {
  active: "success", inactive: "danger",
};

const TYPES = [
  { value: "homestay", label: "Homestay" },
  { value: "hotel", label: "Khách sạn" },
  { value: "villa", label: "Villa" },
  { value: "resort", label: "Resort" },
];

const INVOICE_OPTIONS = [
  { value: "none", label: "Chưa có" },
  { value: "invoice", label: "Hóa đơn" },
  { value: "vat_invoice", label: "VAT" },
  { value: "business_registration", label: "ĐKKD" },
  { value: "in_progress", label: "Đang xử lý" },
];

/** Generate slug from Vietnamese name */
function slugify(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Properties tab: list with CRUD and detail management dialog. */
export function PropertiesTab({ marketId, isAdmin }: PropertiesTabProps) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [detailProp, setDetailProp] = useState<MarketProperty | null>(null);
  const [editItem, setEditItem] = useState<MarketProperty | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const f = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  const { data, isLoading } = useQuery({
    queryKey: ["properties", marketId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: MarketProperty[] }>(`/markets/${marketId}/properties`);
      return res.data.data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name, slug: slugify(form.name), type: form.type,
        propertyCode: form.propertyCode || null,
        starRating: form.starRating || null, address: form.address || null,
        locationDetail: form.locationDetail || null, description: form.description || null,
        amenities: form.amenities,
        status: form.status, invoiceStatus: form.invoiceStatus, notes: form.notes || null,
        images: form.images,
      };
      if (editItem) {
        await apiClient.patch(`/markets/${marketId}/properties/${editItem.id}`, payload);
      } else {
        await apiClient.post(`/markets/${marketId}/properties`, payload);
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["properties", marketId] }); setFormOpen(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/markets/${marketId}/properties/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["properties", marketId] }); setDeleteId(null); },
  });

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setFormOpen(true); };
  const openEdit = (item: MarketProperty) => {
    setEditItem(item);
    setForm({
      name: item.name, propertyCode: item.propertyCode ?? "",
      type: item.type, starRating: item.starRating ?? "",
      address: item.address ?? "", locationDetail: item.locationDetail ?? "",
      description: item.description ?? "", amenities: (item.amenities as string[]) ?? [],
      status: item.status, invoiceStatus: item.invoiceStatus, notes: item.notes ?? "",
      images: (item.images as string[]) ?? [],
    });
    setFormOpen(true);
  };

  const items = data ?? [];
  const sel = "flex h-9 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-1 text-sm";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-md border border-[var(--border)] p-0.5">
          <button type="button" onClick={() => setViewMode("table")}
            className={`rounded px-2 py-1 text-xs ${viewMode === "table" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "text-[var(--muted-foreground)]"}`}>
            <List className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => setViewMode("cards")}
            className={`rounded px-2 py-1 text-xs ${viewMode === "cards" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "text-[var(--muted-foreground)]"}`}>
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>
        {isAdmin && (
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Thêm mới</Button>
        )}
      </div>

      {isLoading ? <div className="flex justify-center py-10"><Spinner /></div> : viewMode === "cards" ? (
        <PropertyCardGrid properties={items} marketId={marketId} isAdmin={isAdmin} onView={(p) => setDetailProp(p)} onEdit={openEdit} />
      ) : (
        <Table>
          <THead><TableHeaderRow>
            <TH>Tên cơ sở</TH><TH>Loại</TH><TH>Sao</TH><TH>Trạng thái</TH><TH>AI</TH><TH className="w-32">Thao tác</TH>
          </TableHeaderRow></THead>
          <TBody>
            {items.length === 0 ? (
              <TR><TD colSpan={6} className="py-8 text-center text-[var(--muted-foreground)]">Chưa có dữ liệu</TD></TR>
            ) : items.map((item) => (
              <TR key={item.id}>
                <TD>
                  <div className="flex items-center gap-3">
                    <ImageThumbnail src={(item.images as string[])?.[0]} alt={item.name} size={44} />
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--foreground)] truncate">{item.name}</p>
                      {item.address && <p className="text-xs text-[var(--muted-foreground)] truncate">{item.address}</p>}
                    </div>
                  </div>
                </TD>
                <TD className="text-sm">{TYPES.find((t) => t.value === item.type)?.label ?? item.type}</TD>
                <TD className="text-sm">{item.starRating ? `${item.starRating}★` : "—"}</TD>
                <TD><Badge variant={STATUS_VARIANT[item.status] ?? "secondary"}>{item.status}</Badge></TD>
                <TD><AiVisibilityToggle entityType="property" entityId={item.id} enabled={item.aiVisible} invalidateKeys={[["properties", marketId]]} /></TD>
                <TD>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setDetailProp(item)}><Eye className="h-4 w-4" /></Button>
                    {isAdmin && (<>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => setDeleteId(item.id)}><Trash2 className="h-4 w-4" /></Button>
                    </>)}
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {detailProp && <PropertyDetailDialog property={detailProp} open={!!detailProp} onOpenChange={(o) => !o && setDetailProp(null)} isAdmin={isAdmin} />}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "Chỉnh sửa cơ sở" : "Thêm cơ sở mới"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 grid-cols-2">
            <div className="col-span-2 flex flex-col gap-1"><label className="text-sm font-medium">Tên *</label><Input value={form.name} onChange={f("name")} /></div>
            <div className="flex flex-col gap-1"><label className="text-sm font-medium">Mã khách sạn</label><Input value={form.propertyCode} onChange={f("propertyCode")} placeholder="VD: HBDNG-001" /></div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Loại *</label>
              <select className={sel} value={form.type} onChange={f("type")}>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
            </div>
            <div className="flex flex-col gap-1"><label className="text-sm font-medium">Xếp hạng sao</label><Input value={form.starRating} onChange={f("starRating")} placeholder="3.5" /></div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Trạng thái</label>
              <select className={sel} value={form.status} onChange={f("status")}><option value="active">Active</option><option value="inactive">Inactive</option></select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Hóa đơn</label>
              <select className={sel} value={form.invoiceStatus} onChange={f("invoiceStatus")}>{INVOICE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
            </div>
            <div className="col-span-2 flex flex-col gap-1"><label className="text-sm font-medium">Địa chỉ</label><Input value={form.address} onChange={f("address")} /></div>
            <div className="col-span-2 flex flex-col gap-1"><label className="text-sm font-medium">Vị trí chi tiết</label><Input value={form.locationDetail} onChange={f("locationDetail")} placeholder="VD: Cách biển 500m, gần trung tâm" /></div>
            <div className="col-span-2 flex flex-col gap-1"><label className="text-sm font-medium">Mô tả</label><Textarea rows={3} value={form.description} onChange={f("description")} /></div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium">Tiện ích</label>
              <AmenityTagPicker selected={form.amenities} onChange={(amenities) => setForm((p) => ({ ...p, amenities }))} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium">Hình ảnh</label>
              <ImageManager images={form.images} onChange={(imgs) => setForm((p) => ({ ...p, images: imgs }))} />
            </div>
            <div className="col-span-2 flex flex-col gap-1"><label className="text-sm font-medium">Ghi chú nội bộ</label><Textarea rows={2} value={form.notes} onChange={f("notes")} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Hủy</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" disabled={saveMutation.isPending || !form.name} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}
        title="Xóa cơ sở" description="Xóa cơ sở và tất cả phòng, bảng giá liên quan?"
        confirmLabel="Xóa" variant="destructive" isLoading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} />
    </div>
  );
}
