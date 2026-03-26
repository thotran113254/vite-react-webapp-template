import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AiVisibilityToggle } from "@/components/market-data/ai-visibility-toggle";
import { Spinner } from "@/components/ui/spinner";
import { apiClient } from "@/lib/api-client";
import type { MarketTargetCustomer } from "@app/shared";

interface TargetCustomersTabProps {
  marketId: string;
  isAdmin: boolean;
}

type FormState = {
  segmentName: string;
  ageRange: string;
  gender: string;
  occupation: string;
  incomeRange: string;
  location: string;
  travelMotivation: string;
  bookingHabits: string;
  stayDuration: string;
  primaryChannels: string;
  painPoints: string;
  preferences: string;
};

const EMPTY_FORM: FormState = {
  segmentName: "", ageRange: "", gender: "", occupation: "",
  incomeRange: "", location: "", travelMotivation: "",
  bookingHabits: "", stayDuration: "", primaryChannels: "",
  painPoints: "", preferences: "",
};

/** Target customers tab: card grid with CRUD. */
export function TargetCustomersTab({ marketId, isAdmin }: TargetCustomersTabProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<MarketTargetCustomer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ["target-customers", marketId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: MarketTargetCustomer[] }>(`/markets/${marketId}/target-customers`);
      return res.data.data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v || null])
      );
      if (editItem) {
        await apiClient.patch(`/markets/${marketId}/target-customers/${editItem.id}`, payload);
      } else {
        await apiClient.post(`/markets/${marketId}/target-customers`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["target-customers", marketId] });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/markets/${marketId}/target-customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["target-customers", marketId] });
      setDeleteId(null);
    },
  });

  const openAdd = () => { setEditItem(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (item: MarketTargetCustomer) => {
    setEditItem(item);
    setForm({
      segmentName: item.segmentName,
      ageRange: item.ageRange ?? "",
      gender: item.gender ?? "",
      occupation: item.occupation ?? "",
      incomeRange: item.incomeRange ?? "",
      location: item.location ?? "",
      travelMotivation: item.travelMotivation ?? "",
      bookingHabits: item.bookingHabits ?? "",
      stayDuration: item.stayDuration ?? "",
      primaryChannels: item.primaryChannels ?? "",
      painPoints: item.painPoints ?? "",
      preferences: item.preferences ?? "",
    });
    setDialogOpen(true);
  };

  const items = data ?? [];

  const f = (key: keyof FormState, label: string, multi = false) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      {multi
        ? <Textarea rows={2} value={form[key]} onChange={(e) => setForm((s) => ({ ...s, [key]: e.target.value }))} />
        : <Input value={form[key]} onChange={(e) => setForm((s) => ({ ...s, [key]: e.target.value }))} />
      }
    </div>
  );

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> Thêm mới
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-[var(--muted-foreground)]">Chưa có dữ liệu</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-[var(--foreground)]">{item.segmentName}</h3>
                <div className="flex items-center gap-1 shrink-0">
                  <AiVisibilityToggle
                    entityType="target-customer"
                    entityId={item.id}
                    enabled={item.aiVisible}
                    invalidateKeys={[["target-customers", marketId]]}
                  />
                  {isAdmin && (
                    <>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-red-500" onClick={() => setDeleteId(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-1 text-sm text-[var(--muted-foreground)]">
                {item.ageRange && <p><span className="font-medium text-[var(--foreground)]">Độ tuổi:</span> {item.ageRange}</p>}
                {item.primaryChannels && <p><span className="font-medium text-[var(--foreground)]">Kênh:</span> {item.primaryChannels}</p>}
                {item.travelMotivation && <p><span className="font-medium text-[var(--foreground)]">Động lực:</span> {item.travelMotivation}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "Chỉnh sửa phân khúc" : "Thêm phân khúc mới"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 grid-cols-2">
            <div className="col-span-2">{f("segmentName", "Tên phân khúc *")}</div>
            {f("ageRange", "Độ tuổi")}
            {f("gender", "Giới tính")}
            {f("occupation", "Nghề nghiệp")}
            {f("incomeRange", "Thu nhập")}
            {f("location", "Địa điểm")}
            {f("stayDuration", "Thời gian lưu trú")}
            <div className="col-span-2">{f("primaryChannels", "Kênh chính")}</div>
            <div className="col-span-2">{f("travelMotivation", "Động lực du lịch", true)}</div>
            <div className="col-span-2">{f("bookingHabits", "Thói quen đặt phòng", true)}</div>
            <div className="col-span-2">{f("painPoints", "Điểm đau", true)}</div>
            <div className="col-span-2">{f("preferences", "Sở thích", true)}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" disabled={saveMutation.isPending || !form.segmentName} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Xóa phân khúc"
        description="Bạn có chắc muốn xóa phân khúc này không?"
        confirmLabel="Xóa"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
