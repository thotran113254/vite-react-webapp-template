import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Calculator, ChevronDown, ChevronRight, AlertCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { usePricingOptions } from "@/hooks/use-pricing-options";
import { apiClient } from "@/lib/api-client";
import { fmtVnd } from "@/lib/format-currency";
import { useAuth } from "@/hooks/use-auth";
import type { ComboCalculateRequest, ComboCalculationResult } from "@app/shared";

const selectCls = "flex h-8 rounded-md border border-[var(--border)] bg-transparent px-2 py-0.5 text-sm";
const inputCls = "h-8 text-sm";

interface Props {
  marketSlug: string;
  propertySlug?: string;
}

/** Compact inline calculator for quick price checks within the pricing page. */
export function PricingQuickCalculator({ marketSlug, propertySlug }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { comboOptions, dayOptions } = usePricingOptions();
  const [open, setOpen] = useState(false);
  const [adults, setAdults] = useState(2);
  const [children10, setChildren10] = useState(0);
  const [children5, setChildren5] = useState(0);
  const [nights, setNights] = useState(2);
  const [dayType, setDayType] = useState("weekday");
  const [transport, setTransport] = useState("");
  const [tripType, setTripType] = useState("roundtrip");
  const [result, setResult] = useState<ComboCalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* Dynamic night options from combo types (e.g., 2n1d → 1 night, 3n2d → 2 nights) */
  const nightOptions = comboOptions.map((c) => {
    const match = c.optionKey.match(/(\d+)n(\d+)/i);
    return { value: match ? Number(match[2]) : 1, label: c.label, key: c.optionKey };
  }).filter((o, i, arr) => arr.findIndex((x) => x.value === o.value) === i);

  const calcMutation = useMutation({
    mutationFn: async () => {
      const payload: ComboCalculateRequest = {
        marketSlug, numAdults: adults, numChildrenUnder10: children10,
        numChildrenUnder5: children5, numNights: nights,
        dayTypes: Array(nights).fill(dayType),
        tripType: (tripType as "oneway" | "roundtrip") || undefined,
      };
      if (propertySlug) payload.propertySlug = propertySlug;
      if (transport) payload.transportClass = transport;
      const res = await apiClient.post<{ data: ComboCalculationResult }>("/combo-calculator/calculate", payload);
      return res.data.data;
    },
    onSuccess: (data) => { setResult(data); setError(null); },
    onError: (err: any) => { setError(err?.response?.data?.message ?? "Lỗi tính giá"); setResult(null); },
  });

  if (!marketSlug) return null;

  return (
    <div className="border-t border-[var(--border)] bg-[var(--card)]">
      {/* Toggle header */}
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-700 dark:text-blue-400 hover:bg-[var(--muted)]/30 transition-colors">
        <Calculator className="h-4 w-4" />
        <span>Tính nhanh</span>
        {open ? <ChevronDown className="h-4 w-4 ml-auto" /> : <ChevronRight className="h-4 w-4 ml-auto" />}
        {result && !open && (
          <span className="text-xs font-normal text-[var(--foreground)] ml-2">
            → {fmtVnd(result.grandTotal)}
            {isAdmin && result.discountGrandTotal != null && (
              <span className="text-orange-500 ml-1">CK: {fmtVnd(result.discountGrandTotal)}</span>
            )}
          </span>
        )}
      </button>

      {open && (
        <div className="px-4 pb-3 space-y-3">
          {/* Input row */}
          <div className="flex items-end gap-2 flex-wrap">
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-[var(--muted-foreground)]">Người lớn</label>
              <Input type="number" min={1} className={inputCls} style={{ width: 56 }}
                value={adults} onChange={(e) => setAdults(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-[var(--muted-foreground)]">Trẻ 5-10t</label>
              <Input type="number" min={0} className={inputCls} style={{ width: 56 }}
                value={children10} onChange={(e) => setChildren10(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-[var(--muted-foreground)]">Trẻ &lt;5t</label>
              <Input type="number" min={0} className={inputCls} style={{ width: 56 }}
                value={children5} onChange={(e) => setChildren5(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-[var(--muted-foreground)]">Số đêm</label>
              <select className={selectCls} value={nights} onChange={(e) => setNights(Number(e.target.value))}>
                {nightOptions.length > 0
                  ? nightOptions.map((o) => <option key={o.key} value={o.value}>{o.label}</option>)
                  : <><option value={1}>2N1Đ</option><option value={2}>3N2Đ</option><option value={3}>4N3Đ</option></>
                }
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-[var(--muted-foreground)]">Loại ngày</label>
              <select className={selectCls} value={dayType} onChange={(e) => setDayType(e.target.value)}>
                {dayOptions.length > 0
                  ? dayOptions.map((o) => <option key={o.optionKey} value={o.optionKey}>{o.label}</option>)
                  : <><option value="weekday">T2-T5</option><option value="friday">T6</option><option value="saturday">T7</option><option value="sunday">CN</option><option value="holiday">Lễ</option></>
                }
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-[var(--muted-foreground)]">Xe</label>
              <select className={selectCls} value={transport} onChange={(e) => setTransport(e.target.value)}>
                <option value="">Không</option><option value="cabin">Cabin</option>
                <option value="limousine">Limousine</option><option value="sleeper">Giường nằm</option>
              </select>
            </div>
            {transport && (
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-[var(--muted-foreground)]">Chuyến</label>
                <select className={selectCls} value={tripType} onChange={(e) => setTripType(e.target.value)}>
                  <option value="roundtrip">Khứ hồi</option><option value="oneway">1 chiều</option>
                </select>
              </div>
            )}
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-8 px-4"
              disabled={calcMutation.isPending} onClick={() => calcMutation.mutate()}>
              {calcMutation.isPending ? <Spinner size="sm" /> : "Tính"}
            </Button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
            </div>
          )}

          {/* Warnings */}
          {result?.warnings && result.warnings.length > 0 && (
            <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <div>{result.warnings.map((w, i) => <p key={i}>{w}</p>)}</div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="flex items-center gap-4 text-sm bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2 flex-wrap">
              <div>
                <span className="text-[var(--muted-foreground)] text-xs">Tổng:</span>
                <span className="ml-1 font-bold text-[var(--foreground)]">{fmtVnd(result.grandTotal)}</span>
                <span className="text-[var(--muted-foreground)] text-xs ml-1">({fmtVnd(result.perPerson)}/người)</span>
              </div>
              {isAdmin && result.discountGrandTotal != null && (
                <div>
                  <span className="text-orange-600 text-xs">CK:</span>
                  <span className="ml-1 font-bold text-orange-600">{fmtVnd(result.discountGrandTotal)}</span>
                </div>
              )}
              {result.rooms.length > 0 && (
                <div className="text-xs text-[var(--muted-foreground)]">
                  {result.rooms.map((r) => `${r.roomType} ×${r.quantity}`).join(", ")}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
