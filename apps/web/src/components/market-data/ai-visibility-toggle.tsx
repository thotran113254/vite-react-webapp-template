import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface AiVisibilityToggleProps {
  entityType: string;
  entityId: string;
  enabled: boolean;
  invalidateKeys?: string[][];
}

/** Toggle switch to control AI visibility for a market entity. */
export function AiVisibilityToggle({
  entityType,
  entityId,
  enabled,
  invalidateKeys = [],
}: AiVisibilityToggleProps) {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      await apiClient.patch(`/ai-toggle/${entityType}/${entityId}`, {
        aiVisible: !enabled,
      });
    },
    onSuccess: () => {
      invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
    },
  });

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={isPending}
      onClick={() => mutate()}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50 ${
        enabled ? "bg-blue-600" : "bg-[var(--muted)]"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          enabled ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}
