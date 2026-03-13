import { forwardRef, useCallback, useEffect, useRef, useState, type SelectHTMLAttributes } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  options: SelectOption[];
  label?: string;
  error?: string;
  placeholder?: string;
}

/** Custom styled select with dropdown panel. Keeps hidden native select for form compatibility. */
const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, label, error, placeholder, className, id, value, disabled, ...props }, ref) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const hiddenRef = useRef<HTMLSelectElement | null>(null);

    // Merge forwarded ref with internal ref
    const setRefs = useCallback(
      (node: HTMLSelectElement | null) => {
        hiddenRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref && typeof ref === "object") {
          (ref as React.MutableRefObject<HTMLSelectElement | null>).current = node;
        }
      },
      [ref],
    );

    // Close on outside click
    useEffect(() => {
      if (!open) return;
      const handler = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    // Close on Escape
    useEffect(() => {
      if (!open) return;
      const handler = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false);
      };
      document.addEventListener("keydown", handler);
      return () => document.removeEventListener("keydown", handler);
    }, [open]);

    const currentValue = String(value ?? "");
    const selectedOption = options.find((o) => o.value === currentValue);
    const displayLabel = selectedOption?.label ?? placeholder ?? options[0]?.label ?? "";

    const handleSelect = (optValue: string) => {
      setOpen(false);
      const el = hiddenRef.current;
      if (!el) return;
      // Set value and dispatch native change event for react-hook-form compatibility
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype,
        "value",
      )?.set;
      nativeInputValueSetter?.call(el, optValue);
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };

    return (
      <div className="flex flex-col gap-1.5" ref={containerRef}>
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-[var(--foreground)]">
            {label}
          </label>
        )}

        {/* Hidden native select for form compat */}
        <select ref={setRefs} id={id} value={currentValue} className="sr-only" tabIndex={-1} aria-hidden {...props}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Custom trigger */}
        <div className="relative">
          <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setOpen((o) => !o)}
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] shadow-sm transition-colors",
              "hover:border-[var(--ring)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 ring-offset-[var(--background)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              open && "ring-2 ring-[var(--ring)] ring-offset-2",
              className,
            )}
          >
            <span className={cn("truncate", !selectedOption && "text-[var(--muted-foreground)]")}>
              {displayLabel}
            </span>
            <ChevronDown
              className={cn(
                "ml-2 h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform",
                open && "rotate-180",
              )}
            />
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute z-50 mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--popover)] text-[var(--popover-foreground)] shadow-lg animate-in fade-in-0 zoom-in-95">
              <div className="max-h-60 overflow-auto p-1">
                {options.map((opt) => {
                  const isSelected = opt.value === currentValue;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors cursor-pointer",
                        "hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
                        isSelected && "bg-[var(--accent)] font-medium",
                      )}
                    >
                      <Check
                        className={cn("h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")}
                      />
                      <span className="truncate">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);
Select.displayName = "Select";

export { Select };
export type { SelectOption, SelectProps };
