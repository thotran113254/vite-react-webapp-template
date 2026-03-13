import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = { sm: "h-4 w-4", md: "h-8 w-8", lg: "h-12 w-12" };

/** Animated loading spinner. */
export function Spinner({ className, size = "md" }: SpinnerProps) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent",
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Đang tải"
    />
  );
}

/** Full-area centered loading state. */
export function PageSpinner() {
  return (
    <div className="flex h-full items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
