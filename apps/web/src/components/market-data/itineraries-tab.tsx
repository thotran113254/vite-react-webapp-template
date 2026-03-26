import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AiVisibilityToggle } from "@/components/market-data/ai-visibility-toggle";
import { ItineraryItemsEditor } from "@/components/market-data/itinerary-items-editor";
import { Spinner } from "@/components/ui/spinner";
import { apiClient } from "@/lib/api-client";
import type { ItineraryTemplate } from "@app/shared";

interface ItinerariesTabProps {
  marketId: string;
  isAdmin: boolean;
}

type TemplateForm = {
  title: string;
  durationDays: string;
  durationNights: string;
  theme: string;
  description: string;
};

const EMPTY_TEMPLATE: TemplateForm = {
  title: "", durationDays: "1", durationNights: "0", theme: "", description: "",
};

/** Itineraries tab: expandable templates with day-grouped item editor. */
export function ItinerariesTab({ marketId, isAdmin }: ItinerariesTabProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ItineraryTemplate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateForm>(EMPTY_TEMPLATE);
  const f = (key: keyof TemplateForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  const { data, isLoading } = useQuery({
    queryKey: ["itineraries", marketId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: ItineraryTemplate[] }>(`/markets/${marketId}/itineraries`);
      return res.data.data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        durationDays: Number(form.durationDays),
        durationNights: Number(form.durationNights),
        theme: form.theme || null,
        description: form.description || null,
      };
      if (editItem) {
        await apiClient.patch(`/markets/${marketId}/itineraries/${editItem.id}`, payload);
      } else {
        await apiClient.post(`/markets/${marketId}/itineraries`, payload);
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["itineraries", marketId] }); setDialogOpen(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/markets/${marketId}/itineraries/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["itineraries", marketId] }); setDeleteId(null); },
  });

  const openAdd = () => { setEditItem(null); setForm(EMPTY_TEMPLATE); setDialogOpen(true); };
  const openEdit = (item: ItineraryTemplate) => {
    setEditItem(item);
    setForm({
      title: item.title, durationDays: String(item.durationDays),
      durationNights: String(item.durationNights), theme: item.theme ?? "", description: item.description ?? "",
    });
    setDialogOpen(true);
  };

  const items = data ?? [];

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> Thêm lịch trình
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-[var(--muted-foreground)]">Chưa có lịch trình</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const expanded = expandedId === item.id;
            return (
              <div key={item.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
                <div className="flex items-center gap-3 p-4">
                  <button className="shrink-0 text-[var(--muted-foreground)]"
                    onClick={() => setExpandedId(expanded ? null : item.id)}>
                    {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--foreground)] truncate">{item.title}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {item.durationDays} ngày {item.durationNights} đêm{item.theme && ` · ${item.theme}`}
                    </p>
                  </div>
                  <Badge variant={item.status === "active" ? "success" : "secondary"}>{item.status}</Badge>
                  <AiVisibilityToggle entityType="itinerary_template" entityId={item.id}
                    enabled={item.aiVisible} invalidateKeys={[["itineraries", marketId]]} />
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-700"
                        onClick={() => setDeleteId(item.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
                {expanded && (
                  <div className="border-t border-[var(--border)] px-4 pb-4">
                    {item.description && <p className="mt-3 text-sm text-[var(--muted-foreground)]">{item.description}</p>}
                    <ItineraryItemsEditor templateId={item.id} isAdmin={isAdmin} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Template create/edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? "Chỉnh sửa lịch trình" : "Thêm lịch trình mới"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Tiêu đề *</label>
              <Input value={form.title} onChange={f("title")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Số ngày</label>
                <Input type="number" value={form.durationDays} onChange={f("durationDays")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Số đêm</label>
                <Input type="number" value={form.durationNights} onChange={f("durationNights")} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Chủ đề</label>
              <Input value={form.theme} onChange={f("theme")} placeholder="honeymoon, family, budget..." />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Mô tả</label>
              <Textarea rows={3} value={form.description} onChange={f("description")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" disabled={saveMutation.isPending || !form.title}
              onClick={() => saveMutation.mutate()}>{saveMutation.isPending ? "Đang lưu..." : "Lưu"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}
        title="Xóa lịch trình" description="Xóa lịch trình và tất cả hoạt động?"
        confirmLabel="Xóa" variant="destructive" isLoading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} />
    </div>
  );
}
