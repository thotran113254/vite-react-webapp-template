import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bus, Ship, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { TransportPricingEditor } from "@/components/market-data/transport-pricing-editor";
import {
  TransportProviderFormDialog, EMPTY_PROVIDER_FORM,
  type TransportProviderFormState,
} from "@/components/market-data/transport-provider-form-dialog";
import { apiClient } from "@/lib/api-client";
import type { TransportProvider } from "@app/shared";

/** Transport pricing overview: flat display with add provider + pricing tables. */
export function PricingTransportOverviewTab({ marketId, isAdmin }: { marketId: string; isAdmin: boolean }) {
  const qc = useQueryClient();
  const [provDialog, setProvDialog] = useState(false);
  const [provForm, setProvForm] = useState<TransportProviderFormState>(EMPTY_PROVIDER_FORM);

  const qk = ["transport-providers", marketId];
  const { data: providers = [], isLoading } = useQuery({
    queryKey: qk,
    enabled: !!marketId,
    queryFn: async () => {
      const res = await apiClient.get<{ data: TransportProvider[] }>(`/markets/${marketId}/transport-providers`);
      return res.data.data ?? [];
    },
  });

  const addProvMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        providerName: provForm.providerName,
        providerCode: provForm.providerCode || null,
        transportCategory: provForm.transportCategory,
        routeName: provForm.routeName,
        notes: provForm.notes || null,
        contactInfo: {
          ...(provForm.contactPhone ? { phone: provForm.contactPhone } : {}),
          ...(provForm.contactZalo ? { zalo: provForm.contactZalo } : {}),
        },
        pickupPoints: provForm.pickupPointsText
          .split("\n").map((l) => l.trim()).filter(Boolean)
          .map((line) => {
            const [name, ...rest] = line.split("-");
            return { name: (name ?? "").trim(), time: rest.join("-").trim() };
          }),
      };
      await apiClient.post(`/markets/${marketId}/transport-providers`, payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk }); setProvDialog(false); },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <div className="space-y-4">
      {/* Header with count + Add button */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-[var(--muted-foreground)]">{providers.length} nhà xe/tàu</p>
        {isAdmin && (
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 h-7 text-xs"
            onClick={() => { setProvForm(EMPTY_PROVIDER_FORM); setProvDialog(true); }}>
            <Plus className="mr-1 h-3 w-3" /> Thêm nhà xe/tàu
          </Button>
        )}
      </div>

      {providers.length === 0 && (
        <p className="text-sm text-[var(--muted-foreground)] text-center py-6">
          Chưa có nhà xe/tàu. Nhấn "Thêm nhà xe/tàu" để bắt đầu.
        </p>
      )}

      {/* All providers flat with pricing tables */}
      {providers.map((prov) => {
        const isFerry = prov.transportCategory === "ferry";
        const Icon = isFerry ? Ship : Bus;
        return (
          <div key={prov.id} className="border border-[var(--border)] rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-teal-600 shrink-0" />
              <span className="text-sm font-semibold text-[var(--foreground)]">{prov.providerName}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                isFerry
                  ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              }`}>
                {isFerry ? "Tàu/phà" : "Xe khách"}
              </span>
              <span className="text-xs text-[var(--muted-foreground)]">{prov.routeName}</span>
            </div>
            <TransportPricingEditor providerId={prov.id} isAdmin={isAdmin} />
          </div>
        );
      })}

      {/* Add provider dialog — reuse existing form */}
      <TransportProviderFormDialog
        open={provDialog} onOpenChange={setProvDialog}
        form={provForm} setForm={setProvForm}
        isEditing={false} isSaving={addProvMutation.isPending}
        onSave={() => addProvMutation.mutate()}
      />
    </div>
  );
}
