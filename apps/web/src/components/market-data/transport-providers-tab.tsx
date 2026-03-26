import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD, TableHeaderRow } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AiVisibilityToggle } from "@/components/market-data/ai-visibility-toggle";
import { Spinner } from "@/components/ui/spinner";
import { TransportPricingEditor } from "@/components/market-data/transport-pricing-editor";
import {
  TransportProviderFormDialog,
  EMPTY_PROVIDER_FORM,
  type TransportProviderFormState,
} from "@/components/market-data/transport-provider-form-dialog";
import { apiClient } from "@/lib/api-client";
import type { TransportProvider } from "@app/shared";

interface TransportProvidersTabProps {
  marketId: string;
  isAdmin: boolean;
}

function CategoryBadge({ category }: { category: string }) {
  const isFerry = category === "ferry";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
      isFerry ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300"
               : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
    }`}>
      {isFerry ? "Tàu/phà" : "Xe khách"}
    </span>
  );
}

/** Transport providers tab: list and CRUD for providers with expandable pricing editor. */
export function TransportProvidersTab({ marketId, isAdmin }: TransportProvidersTabProps) {
  const queryClient = useQueryClient();
  const qk = ["transport-providers", marketId];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<TransportProvider | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<TransportProviderFormState>(EMPTY_PROVIDER_FORM);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => {
      const res = await apiClient.get<{ data: TransportProvider[] }>(`/markets/${marketId}/transport-providers`);
      return res.data.data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const pickupPoints = form.pickupPointsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const match = line.match(/^(\S+)\s+(.+)$/);
          return match ? { time: match[1]!, name: match[2]! } : { time: "", name: line };
        });
      const contactInfo: Record<string, string> = {};
      if (form.contactPhone) contactInfo.phone = form.contactPhone;
      if (form.contactZalo) contactInfo.zalo = form.contactZalo;
      const payload = {
        providerName: form.providerName,
        providerCode: form.providerCode || null,
        transportCategory: form.transportCategory,
        routeName: form.routeName,
        pickupPoints: pickupPoints.length > 0 ? pickupPoints : [],
        contactInfo: Object.keys(contactInfo).length > 0 ? contactInfo : {},
        notes: form.notes || null,
        images: form.images,
        pricingNotes: form.pricingNotes || null,
      };
      if (editItem) {
        await apiClient.patch(`/markets/${marketId}/transport-providers/${editItem.id}`, payload);
      } else {
        await apiClient.post(`/markets/${marketId}/transport-providers`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/markets/${marketId}/transport-providers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      setDeleteId(null);
    },
  });

  const openAdd = () => {
    setEditItem(null);
    setForm(EMPTY_PROVIDER_FORM);
    setDialogOpen(true);
  };

  const openEdit = (item: TransportProvider) => {
    setEditItem(item);
    const points = (item.pickupPoints ?? []) as Array<{ name: string; time: string }>;
    const contact = (item.contactInfo ?? {}) as Record<string, string>;
    setForm({
      providerName: item.providerName,
      providerCode: item.providerCode ?? "",
      transportCategory: item.transportCategory,
      routeName: item.routeName,
      pickupPointsText: points.map((p) => `${p.time} ${p.name}`).join("\n"),
      contactPhone: contact.phone ?? "",
      contactZalo: contact.zalo ?? "",
      notes: item.notes ?? "",
      images: item.images ?? [],
      pricingNotes: item.pricingNotes ?? "",
    });
    setDialogOpen(true);
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const items = data ?? [];
  const colSpan = isAdmin ? 6 : 5;

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> Thêm nhà xe/tàu
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <Table>
          <THead>
            <TableHeaderRow>
              <TH className="w-8"></TH>
              <TH>Tên nhà xe/tàu</TH>
              <TH>Loại</TH>
              <TH>Tuyến đường</TH>
              <TH>AI</TH>
              {isAdmin && <TH className="w-24">Thao tác</TH>}
            </TableHeaderRow>
          </THead>
          <TBody>
            {items.length === 0 ? (
              <TR>
                <TD colSpan={colSpan} className="py-8 text-center text-[var(--muted-foreground)]">
                  Chưa có dữ liệu
                </TD>
              </TR>
            ) : items.map((item) => (
              <>
                <TR key={item.id}>
                  <TD>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => toggleExpand(item.id)}
                    >
                      {expandedId === item.id
                        ? <ChevronDown className="h-3.5 w-3.5" />
                        : <ChevronRight className="h-3.5 w-3.5" />}
                    </Button>
                  </TD>
                  <TD>
                    <p className="font-medium text-[var(--foreground)]">{item.providerName}</p>
                    {item.providerCode && (
                      <p className="text-xs text-[var(--muted-foreground)]">{item.providerCode}</p>
                    )}
                  </TD>
                  <TD>
                    <CategoryBadge category={item.transportCategory} />
                  </TD>
                  <TD className="text-sm text-[var(--muted-foreground)]">{item.routeName}</TD>
                  <TD>
                    <AiVisibilityToggle
                      entityType="transport-provider"
                      entityId={item.id}
                      enabled={item.aiVisible}
                      invalidateKeys={[qk]}
                    />
                  </TD>
                  {isAdmin && (
                    <TD>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => setDeleteId(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TD>
                  )}
                </TR>
                {expandedId === item.id && (
                  <TR key={`${item.id}-pricing`}>
                    <TD colSpan={colSpan} className="p-0 bg-[var(--muted)]/20">
                      <TransportPricingEditor providerId={item.id} isAdmin={isAdmin} />
                    </TD>
                  </TR>
                )}
              </>
            ))}
          </TBody>
        </Table>
      )}

      <TransportProviderFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        setForm={setForm}
        isEditing={!!editItem}
        isSaving={saveMutation.isPending}
        onSave={() => saveMutation.mutate()}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Xóa nhà xe/tàu"
        description="Bạn có chắc muốn xóa nhà xe/tàu này không? Tất cả bảng giá liên quan cũng sẽ bị xóa."
        confirmLabel="Xóa"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
