import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatSession } from "@app/shared";

interface ChatSessionSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | undefined;
  onSelect: (session: ChatSession) => void;
  onNew: () => void;
  onDelete: (sessionId: string) => void;
  isCreating?: boolean;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Hôm qua";
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

/** Sidebar listing chat sessions with new/switch/delete actions. */
export function ChatSessionSidebar({
  sessions,
  activeSessionId,
  onSelect,
  onNew,
  onDelete,
  isCreating,
}: ChatSessionSidebarProps) {
  return (
    <div className="flex h-full w-64 flex-col border-r border-[var(--border)] bg-[var(--card)]">
      {/* New chat button */}
      <div className="p-3">
        <button
          type="button"
          onClick={onNew}
          disabled={isCreating}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-sm",
            "text-[var(--muted-foreground)] transition-colors hover:border-teal-500 hover:text-teal-600",
            "disabled:opacity-50",
          )}
        >
          <Plus size={16} />
          Chat mới
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {sessions.length === 0 && (
          <p className="px-3 py-4 text-center text-xs text-[var(--muted-foreground)]">
            Chưa có cuộc hội thoại nào
          </p>
        )}
        {sessions.map((s) => (
          <div
            key={s.id}
            className={cn(
              "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors",
              s.id === activeSessionId
                ? "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
                : "text-[var(--foreground)] hover:bg-[var(--accent)]",
            )}
            onClick={() => onSelect(s)}
          >
            <MessageSquare size={14} className="shrink-0 opacity-50" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{s.title}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{formatDate(s.createdAt)}</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(s.id);
              }}
              className="shrink-0 rounded p-1 opacity-0 transition-opacity hover:bg-red-100 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-900/30"
              aria-label="Xóa"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
