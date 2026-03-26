import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";

export interface SurchargeRule {
  label: string;
  ageMin: number;
  ageMax: number;
  price: number;
}

export const DEFAULT_SURCHARGE_RULES: SurchargeRule[] = [
  { label: "Trẻ em < 5 tuổi", ageMin: 0, ageMax: 5, price: 0 },
  { label: "Trẻ em > 5 tuổi", ageMin: 5, ageMax: 18, price: 100000 },
];

interface SurchargeRulesEditorProps {
  rules: SurchargeRule[];
  onChange: (rules: SurchargeRule[]) => void;
  adultSurcharge: string;
  onAdultSurchargeChange: (v: string) => void;
}

export function SurchargeRulesEditor({
  rules, onChange, adultSurcharge, onAdultSurchargeChange,
}: SurchargeRulesEditorProps) {
  const updateRule = (i: number, partial: Partial<SurchargeRule>) => {
    const updated = rules.map((r, idx) => idx === i ? { ...r, ...partial } : r);
    onChange(updated);
  };

  const removeRule = (i: number) => onChange(rules.filter((_, idx) => idx !== i));

  const addRule = () => onChange([...rules, { label: "", ageMin: 0, ageMax: 18, price: 0 }]);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Phụ thu</p>
      {/* Adult surcharge row */}
      <div className="grid grid-cols-[1fr_140px] gap-2 items-center">
        <span className="text-sm">Người lớn thêm</span>
        <CurrencyInput value={adultSurcharge} onChange={onAdultSurchargeChange} />
      </div>
      {/* Child rules */}
      {rules.map((rule, i) => (
        <div key={i} className="grid grid-cols-[1fr_80px_80px_120px_auto] gap-1.5 items-center">
          <Input
            value={rule.label}
            placeholder="Nhãn (VD: Trẻ em < 5 tuổi)"
            onChange={(e) => updateRule(i, { label: e.target.value })}
            className="h-8 text-sm"
          />
          <Input
            type="number"
            value={rule.ageMin}
            placeholder="Tuổi min"
            onChange={(e) => updateRule(i, { ageMin: Number(e.target.value) })}
            className="h-8 text-sm"
          />
          <Input
            type="number"
            value={rule.ageMax}
            placeholder="Tuổi max"
            onChange={(e) => updateRule(i, { ageMax: Number(e.target.value) })}
            className="h-8 text-sm"
          />
          <CurrencyInput
            value={String(rule.price)}
            onChange={(v) => updateRule(i, { price: Number(v) || 0 })}
          />
          <button
            type="button"
            onClick={() => removeRule(i)}
            className="text-[var(--muted-foreground)] hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" className="text-xs text-blue-600 h-7" onClick={addRule}>
        <Plus className="mr-1 h-3 w-3" /> Thêm quy tắc phụ thu
      </Button>
    </div>
  );
}
