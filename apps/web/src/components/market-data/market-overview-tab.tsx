import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api-client";
import type { Market } from "@app/shared";

interface MarketOverviewTabProps {
  market: Market;
  isAdmin: boolean;
}

/** Tab for viewing and editing market basic info. */
export function MarketOverviewTab({ market, isAdmin }: MarketOverviewTabProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: market.name,
    region: market.region ?? "",
    description: market.description ?? "",
    geography: market.geography ?? "",
    seasonInfo: market.seasonInfo ?? "",
    highlights: market.highlights ?? "",
    travelTips: market.travelTips ?? "",
  });

  const { mutate, isPending, isSuccess, isError } = useMutation({
    mutationFn: async () => {
      await apiClient.patch(`/markets/${market.id}`, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market", market.id] });
      queryClient.invalidateQueries({ queryKey: ["markets"] });
    },
  });

  const field = (
    key: keyof typeof form,
    label: string,
    multiline = false,
  ) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-[var(--foreground)]">{label}</label>
      {multiline ? (
        <Textarea
          rows={3}
          value={form[key]}
          disabled={!isAdmin}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        />
      ) : (
        <Input
          value={form[key]}
          disabled={!isAdmin}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-5 max-w-2xl">
      {field("name", "Tên thị trường")}
      {field("region", "Vùng / Khu vực")}
      {field("description", "Mô tả", true)}
      {field("geography", "Đặc điểm địa lý", true)}
      {field("seasonInfo", "Thông tin mùa vụ", true)}
      {field("highlights", "Điểm nổi bật", true)}
      {field("travelTips", "Mẹo du lịch", true)}

      {isAdmin && (
        <div className="flex items-center gap-3">
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isPending}
            onClick={() => mutate()}
          >
            <Save className="mr-2 h-4 w-4" />
            {isPending ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
          {isSuccess && (
            <span className="text-sm text-green-600">Đã lưu thành công</span>
          )}
          {isError && (
            <span className="text-sm text-red-600">Lỗi khi lưu, thử lại</span>
          )}
        </div>
      )}
    </div>
  );
}
