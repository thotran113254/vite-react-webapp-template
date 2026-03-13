import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ResourceForm } from "@/components/resource/resource-form";
import { getErrorMessage } from "@/lib/error-utils";
import { apiClient } from "@/lib/api-client";
import { createResourceSchema, RESOURCE_CATEGORIES } from "@app/shared";
import type { CreateResourceInput, ApiResponse, Resource } from "@app/shared";

interface ResourceCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_VALUES = {
  name: "",
  description: "",
  category: RESOURCE_CATEGORIES[0].value,
};

/** Modal dialog for creating a new resource with optimistic list update. */
export function ResourceCreateModal({
  open,
  onOpenChange,
}: ResourceCreateModalProps) {
  const queryClient = useQueryClient();

  const form = useForm<CreateResourceInput>({
    resolver: zodResolver(createResourceSchema),
    defaultValues: DEFAULT_VALUES,
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) form.reset(DEFAULT_VALUES);
  }, [open, form]);

  const createMutation = useMutation({
    mutationFn: async (dto: CreateResourceInput) => {
      const res = await apiClient.post<ApiResponse<Resource>>("/resources", dto);
      return res.data.data!;
    },
    onMutate: async (dto) => {
      await queryClient.cancelQueries({ queryKey: ["resource-list"] });
      const previous = queryClient.getQueryData<Resource[]>(["resource-list"]);
      queryClient.setQueryData<Resource[]>(["resource-list"], (old) => [
        ...(old ?? []),
        {
          id: `temp-${Date.now()}`,
          name: dto.name,
          slug: "",
          description: dto.description,
          status: "pending",
          category: dto.category,
          metadata: dto.metadata ?? {},
          userId: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } satisfies Resource,
      ]);
      return { previous };
    },
    onError: (err: unknown, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["resource-list"], context.previous);
      }
      form.setError("root", { message: getErrorMessage(err) });
    },
    onSuccess: () => {
      form.reset(DEFAULT_VALUES);
      onOpenChange(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-list"] });
    },
  });

  const onSubmit = form.handleSubmit((data) =>
    createMutation.mutate(data),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo tài nguyên</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <ResourceForm
            register={form.register}
            errors={form.formState.errors}
            disabled={createMutation.isPending}
          />
          {form.formState.errors.root && (
            <p className="mt-3 text-sm text-red-600">
              {form.formState.errors.root.message}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Đang tạo..." : "Tạo mới"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
