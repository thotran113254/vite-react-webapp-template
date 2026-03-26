import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Calculator, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { ComboResultCard } from "@/components/pricing/combo-result-card";
import type { Market, MarketProperty, ComboCalculateRequest, ComboCalculationResult } from "@app/shared";

const NUM_NIGHTS_OPTIONS = [
  { value: 1, label: "2N1Đ" },
  { value: 2, label: "3N2Đ" },
  { value: 3, label: "4N3Đ" },
];

const DAY_TYPE_OPTIONS = [
  { value: "weekday", label: "T2-T5 (Ngày thường)" },
  { value: "friday", label: "T6 (Thứ 6)" },
  { value: "saturday", label: "T7 (Thứ 7)" },
  { value: "sunday", label: "CN (Chủ nhật)" },
  { value: "holiday", label: "Ngày lễ" },
];

const TRANSPORT_OPTIONS = [
  { value: "", label: "Không" },
  { value: "cabin", label: "Cabin" },
  { value: "limousine", label: "Limousine" },
  { value: "sleeper", label: "Giường nằm" },
];

const FERRY_OPTIONS = [
  { value: "", label: "Không" },
  { value: "speed_boat", label: "Tàu cao tốc" },
  { value: "small_boat", label: "Tàu nhỏ" },
];

const TRIP_TYPE_OPTIONS = [
  { value: "roundtrip", label: "Khứ hồi" },
  { value: "oneway", label: "Một chiều" },
];

const NIGHT_LABELS = ["Đêm 1", "Đêm 2", "Đêm 3"];

type FormState = {
  marketSlug: string;
  propertySlug: string;
  numAdults: number;
  numChildrenUnder10: number;
  numChildrenUnder5: number;
  numNights: number;
  /** Per-night day types (length === numNights) */
  dayTypes: string[];
  transportClass: string;
  ferryClass: string;
  tripType: string;
  departureProvince: string;
  profitMarginOverride: string;
};

function defaultDayTypes(n: number): string[] {
  return Array(n).fill("weekday");
}

const EMPTY_FORM: FormState = {
  marketSlug: "", propertySlug: "", numAdults: 2,
  numChildrenUnder10: 0, numChildrenUnder5: 0,
  numNights: 1, dayTypes: defaultDayTypes(1),
  transportClass: "", ferryClass: "",
  tripType: "roundtrip", departureProvince: "",
  profitMarginOverride: "",
};

const selectCls = "flex h-9 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-1 text-sm";

/** Combo price calculator page with left input panel and right result panel. */
export default function ComboCalculatorPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [result, setResult] = useState<ComboCalculationResult | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);

  const setField = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleNumNightsChange = (n: number) => {
    setForm((f) => {
      const existing = f.dayTypes;
      // Extend or truncate dayTypes to match new numNights
      const newDayTypes = Array(n).fill("weekday").map((def, i) => existing[i] ?? def);
      return { ...f, numNights: n, dayTypes: newDayTypes };
    });
  };

  const handleDayTypeChange = (nightIndex: number, value: string) => {
    setForm((f) => {
      const updated = [...f.dayTypes];
      updated[nightIndex] = value;
      return { ...f, dayTypes: updated };
    });
  };

  // Load markets
  const { data: markets = [], isLoading: marketsLoading } = useQuery({
    queryKey: ["markets"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Market[] }>("/markets");
      return res.data.data ?? [];
    },
  });

  // Load properties when market is selected
  const selectedMarket = markets.find((m) => m.slug === form.marketSlug);
  const { data: properties = [] } = useQuery({
    queryKey: ["market-properties", selectedMarket?.id],
    enabled: !!selectedMarket?.id,
    queryFn: async () => {
      const res = await apiClient.get<{ data: MarketProperty[] }>(`/markets/${selectedMarket!.id}/properties`);
      return res.data.data ?? [];
    },
  });

  const handleMarketChange = (slug: string) => {
    setForm((f) => ({ ...f, marketSlug: slug, propertySlug: "" }));
  };

  const calcMutation = useMutation({
    mutationFn: async () => {
      const payload: ComboCalculateRequest = {
        marketSlug: form.marketSlug,
        numAdults: form.numAdults,
        numChildrenUnder10: form.numChildrenUnder10,
        numChildrenUnder5: form.numChildrenUnder5,
        numNights: form.numNights,
        // Use dayTypes array (supports mixed-day bookings)
        dayTypes: form.dayTypes,
        tripType: (form.tripType as "oneway" | "roundtrip") || undefined,
      };
      if (form.propertySlug) payload.propertySlug = form.propertySlug;
      if (form.transportClass) payload.transportClass = form.transportClass;
      if (form.ferryClass) payload.ferryClass = form.ferryClass;
      if (form.departureProvince) payload.departureProvince = form.departureProvince;
      const marginNum = Number(form.profitMarginOverride);
      if (form.profitMarginOverride && !isNaN(marginNum)) payload.profitMarginOverride = marginNum;
      const res = await apiClient.post<{ data: ComboCalculationResult }>("/combo-calculator/calculate", payload);
      return res.data.data;
    },
    onSuccess: (data) => { setResult(data); setCalcError(null); },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? "Lỗi tính giá";
      setCalcError(msg);
    },
  });

  const canSubmit = !!form.marketSlug && form.numAdults >= 1;

  // Check if all nights share the same day type (for compact display)
  const allSameDayType = form.dayTypes.every((dt) => dt === form.dayTypes[0]);

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-6 py-4">
        <Calculator className="h-5 w-5 text-blue-600" />
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Tính giá combo</h1>
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden gap-0">
        {/* Left panel: input form */}
        <div className="w-80 flex-shrink-0 border-r border-[var(--border)] overflow-y-auto p-5 space-y-4">
          {/* Market */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Thị trường *</label>
            {marketsLoading ? <Spinner size="sm" /> : (
              <select className={selectCls} value={form.marketSlug} onChange={(e) => handleMarketChange(e.target.value)}>
                <option value="">-- Chọn thị trường --</option>
                {markets.map((m) => <option key={m.id} value={m.slug}>{m.name}</option>)}
              </select>
            )}
          </div>

          {/* Property */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Khách sạn</label>
            <select className={selectCls} value={form.propertySlug} onChange={(e) => setField("propertySlug", e.target.value)} disabled={!form.marketSlug}>
              <option value="">Tự chọn tối ưu</option>
              {properties.map((p) => <option key={p.id} value={p.slug}>{p.name}</option>)}
            </select>
          </div>

          {/* People */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Người lớn</label>
              <Input type="number" min={1} value={form.numAdults} onChange={(e) => setField("numAdults", Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Trẻ &lt;10</label>
              <Input type="number" min={0} value={form.numChildrenUnder10} onChange={(e) => setField("numChildrenUnder10", Number(e.target.value))} />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-sm font-medium">Trẻ &lt;5</label>
              <Input type="number" min={0} value={form.numChildrenUnder5} onChange={(e) => setField("numChildrenUnder5", Number(e.target.value))} />
            </div>
          </div>

          {/* Nights */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Số đêm</label>
            <select className={selectCls} value={form.numNights} onChange={(e) => handleNumNightsChange(Number(e.target.value))}>
              {NUM_NIGHTS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Day types per night - show individual selector per night when numNights > 1 */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Loại ngày{form.numNights > 1 && " (từng đêm)"}
            </label>
            {form.numNights === 1 ? (
              <select
                className={selectCls}
                value={form.dayTypes[0] ?? "weekday"}
                onChange={(e) => handleDayTypeChange(0, e.target.value)}
              >
                {DAY_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <div className="space-y-2">
                {form.dayTypes.map((dt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-[var(--muted-foreground)] w-12 shrink-0">{NIGHT_LABELS[i] ?? `Đêm ${i + 1}`}</span>
                    <select
                      className={selectCls}
                      value={dt}
                      onChange={(e) => handleDayTypeChange(i, e.target.value)}
                    >
                      {DAY_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                ))}
                {!allSameDayType && (
                  <p className="text-xs text-blue-600">Lịch hỗn hợp: các đêm có loại ngày khác nhau</p>
                )}
              </div>
            )}
          </div>

          {/* Transport */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Xe</label>
            <select className={selectCls} value={form.transportClass} onChange={(e) => setField("transportClass", e.target.value)}>
              {TRANSPORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Trip type - only show when transport is selected */}
          {form.transportClass && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Loại chuyến</label>
              <select className={selectCls} value={form.tripType} onChange={(e) => setField("tripType", e.target.value)}>
                {TRIP_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          )}

          {/* Departure province - only show when transport is selected */}
          {form.transportClass && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Tỉnh khởi hành</label>
              <Input
                placeholder="Vd: Quảng Ninh (để trống nếu không)"
                value={form.departureProvince}
                onChange={(e) => setField("departureProvince", e.target.value)}
              />
            </div>
          )}

          {/* Profit margin override (admin only) */}
          {isAdmin && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-orange-600">Biên lợi nhuận % (override)</label>
              <Input
                type="number" min={0} max={100}
                placeholder="Mặc định từ DB (15%)"
                value={form.profitMarginOverride}
                onChange={(e) => setField("profitMarginOverride", e.target.value)}
              />
            </div>
          )}

          {/* Ferry */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Tàu</label>
            <select className={selectCls} value={form.ferryClass} onChange={(e) => setField("ferryClass", e.target.value)}>
              {FERRY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!canSubmit || calcMutation.isPending}
            onClick={() => calcMutation.mutate()}
          >
            {calcMutation.isPending ? <><Spinner size="sm" /><span className="ml-2">Đang tính...</span></> : "Tính giá"}
          </Button>

          {calcError && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{calcError}</span>
            </div>
          )}
        </div>

        {/* Right panel: result */}
        <div className="flex-1 overflow-y-auto p-5">
          {!result && !calcMutation.isPending && (
            <div className="flex h-full items-center justify-center text-center text-[var(--muted-foreground)]">
              <div>
                <Calculator className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Nhập thông tin bên trái để tính giá combo</p>
              </div>
            </div>
          )}

          {calcMutation.isPending && (
            <div className="flex h-full items-center justify-center">
              <Spinner size="lg" />
            </div>
          )}

          {result && !calcMutation.isPending && (
            <>
              {result.warnings && result.warnings.length > 0 && (
                <div className="mb-4 rounded-md bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-700 dark:text-amber-400">
                  <div className="flex items-center gap-2 mb-1 font-medium">
                    <AlertCircle className="h-4 w-4" />
                    <span>Lưu ý</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1">
                    {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
              <ComboResultCard result={result} isAdmin={isAdmin} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
