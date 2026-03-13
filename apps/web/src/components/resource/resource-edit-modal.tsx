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
import { createResourceSchema } from "@app/shared";
import type { CreateResourceInput, Resource, ApiResponse, UpdateResourceDto } from "@app/shared";

interface ResourceEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: Resource | null;
}

/** Modal dialog for editing a resource with optimistic cache update. */
export function ResourceEditModal({
  open,
  onOpenChange,
  resource,
}: ResourceEditModalProps) {
  const queryClient = useQueryClient();

  const form = useForm<CreateResourceInput>({
    resolver: zodResolver(createResourceSchema),
    defaultValues: { name: "", description: "", category: "" },
  });

  // Sync form when resource changes
  useEffect(() => {
    if (resource) {
      form.reset({
        name: resource.name,
        description: resource.description,
        category: resource.category,
      });
    }
  }, [resource, form]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateResourceDto }) => {
      const res = await apiClient.patch<ApiResponse<Resource>>(
        `/resources/${id}`,
        dto,
      );
      return res.data.data!;
    },
    onMutate: async ({ id, dto }) => {
      await queryClient.cancelQueries({ queryKey: ["resource-list"] });
      await queryClient.cancelQueries({ queryKey: ["resource", id] });

      const prevList = queryClient.getQueryData<Resource[]>(["resource-list"]);
      const prevDetail = queryClient.getQueryData<Resource>(["resource", id]);

      queryClient.setQueryData<Resource[]>(["resource-list"], (old) =>
        (old ?? []).map((r) =>
          r.id === id ? { ...r, ...dto, updatedAt: new Date().toISOString() } : r,
        ),
      );
      if (prevDetail) {
        queryClient.setQueryData<Resource>(["resource", id], {
          ...prevDetail,
          ...dto,
          updatedAt: new Date().toISOString(),
        });
      }

      return { prevList, prevDetail };
    },
    onError: (err: unknown, { id }, context) => {
      if (context?.prevList)
        queryClient.setQueryData(["resource-list"], context.prevList);
      if (context?.prevDetail)
        queryClient.setQueryData(["resource", id], context.prevDetail);
      form.setError("root", { message: getErrorMessage(err) });
    },
    onSuccess: () => onOpenChange(false),
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["resource-list"] });
      queryClient.invalidateQueries({ queryKey: ["resource", id] });
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    if (!resource) return;
    updateMutation.mutate({
      id: resource.id,
      dto: { name: data.name, description: data.description, category: data.category },
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sửa tài nguyên</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <ResourceForm
            register={form.register}
            errors={form.formState.errors}
            disabled={updateMutation.isPending}
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
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending || !resource}>
              {updateMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
