import { useRef, useEffect, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

/** Chat input bar with Enter-to-send and teal send button. Auto-focuses when enabled. */
export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus when input becomes enabled (e.g. after AI finishes)
  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  function handleSend() {
    const value = inputRef.current?.value.trim();
    if (!value || disabled) return;
    onSend(value);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 shadow-sm">
      <input
        ref={inputRef}
        type="text"
        placeholder="Hỏi AI về khách sạn..."
        disabled={disabled}
        onKeyDown={handleKeyDown}
        className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none disabled:opacity-50"
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={disabled}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white transition-colors",
          "hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1",
          "disabled:pointer-events-none disabled:opacity-50",
        )}
        aria-label="Gửi tin nhắn"
      >
        <Send size={15} />
      </button>
    </div>
  );
}
