import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "./markdown-renderer";

interface ChatMessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Renders a single chat message aligned by role with avatar and timestamp. */
export function ChatMessageBubble({ role, content, createdAt }: ChatMessageBubbleProps) {
  const isAssistant = role === "assistant";

  return (
    <div
      className={cn(
        "flex gap-2.5",
        isAssistant ? "flex-row" : "flex-row-reverse",
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isAssistant ? "bg-teal-600 text-white" : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
        )}
      >
        {isAssistant ? <Bot size={16} /> : <User size={16} />}
      </div>

      {/* Bubble + timestamp */}
      <div
        className={cn(
          "flex max-w-[75%] flex-col gap-1",
          isAssistant ? "items-start" : "items-end",
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isAssistant
              ? "rounded-tl-sm bg-teal-50 text-gray-800 dark:bg-teal-900/40 dark:text-gray-200"
              : "rounded-tr-sm bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
          )}
        >
          {isAssistant ? <MarkdownRenderer content={content} /> : content}
        </div>
        <span className="text-xs text-[var(--muted-foreground)]">{formatTime(createdAt)}</span>
      </div>
    </div>
  );
}
