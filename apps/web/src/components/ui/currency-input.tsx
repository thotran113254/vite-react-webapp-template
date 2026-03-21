import { useRef, useEffect, useMemo, forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const fmt = (raw: string) => {
  if (!raw) return "";
  const num = Number(raw);
  return isNaN(num) ? raw : new Intl.NumberFormat("vi-VN").format(num);
};

interface CurrencyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  /** Raw numeric string value (e.g., "1500000") */
  value: string;
  /** Returns raw numeric string on change */
  onChange: (value: string) => void;
}

/**
 * Currency input with real-time VN formatting (as-you-type).
 * Always displays 1.500.000 style — cursor position auto-corrected.
 */
const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, className, placeholder, ...props }, _ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const cursorRef = useRef<number>(0);

    const formatted = useMemo(() => fmt(value), [value]);

    /* Restore cursor after React re-renders the formatted value */
    useEffect(() => {
      const el = inputRef.current;
      if (el && document.activeElement === el) {
        el.setSelectionRange(cursorRef.current, cursorRef.current);
      }
    }, [formatted]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const el = e.target;
      const cursorPos = el.selectionStart ?? 0;
      const oldVal = el.value;

      /* Count digits before cursor in the old displayed value */
      let digitsBefore = 0;
      for (let i = 0; i < cursorPos; i++) {
        if (/\d/.test(oldVal[i]!)) digitsBefore++;
      }

      /* Extract raw digits */
      const raw = oldVal.replace(/\D/g, "");
      onChange(raw);

      /* Calculate where cursor should land in the new formatted string */
      const newFmt = fmt(raw);
      let newCursor = 0;
      let counted = 0;
      for (let i = 0; i < newFmt.length && counted < digitsBefore; i++) {
        newCursor = i + 1;
        if (/\d/.test(newFmt[i]!)) counted++;
      }
      cursorRef.current = newCursor;
    };

    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={formatted}
        onChange={handleChange}
        placeholder={placeholder ?? "0"}
        className={cn(
          "flex h-10 w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] ring-offset-[var(--background)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
