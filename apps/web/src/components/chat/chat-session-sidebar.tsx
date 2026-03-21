import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Plus, MessageSquare, Trash2, Pin, PinOff, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatSession } from "@app/shared";

interface ChatSessionSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | undefined;
  onSelect: (session: ChatSession) => void;
  onNew: () => void;
  onDelete: (sessionId: string) => void;
  onUpdate: (sessionId: string, updates: { title?: string; isPinned?: boolean }) => void;
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

/** Inline title editor */
function TitleEditor({ value, onSave, onCancel }: { value: string; onSave: (v: string) => void; onCancel: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(value);

  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);

  function handleKey(e: KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); onSave(text.trim() || value); }
    if (e.key === "Escape") onCancel();
  }

  return (
    <div className="flex items-center gap-1">
      <input
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => onSave(text.trim() || value)}
        className="w-full rounded border border-teal-400 bg-transparent px-1 py-0.5 text-sm focus:outline-none"
        maxLength={100}
      />
    </div>
  );
}

/** Sidebar listing chat sessions with pin, rename, delete. Pinned sessions sorted first. */
export function ChatSessionSidebar({
  sessions,
  activeSessionId,
  onSelect,
  onNew,
  onDelete,
  onUpdate,
  isCreating,
}: ChatSessionSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  // Sort: pinned first, then by createdAt desc
  const sorted = [...sessions].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const pinned = sorted.filter((s) => s.isPinned);
  const unpinned = sorted.filter((s) => !s.isPinned);

  function renderSession(s: ChatSession) {
    const isActive = s.id === activeSessionId;
    const isEditing = editingId === s.id;

    return (
      <div
        key={s.id}
        className={cn(
          "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors",
          isActive
            ? "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
            : "text-[var(--foreground)] hover:bg-[var(--accent)]",
        )}
        onClick={() => !isEditing && onSelect(s)}
      >
        {s.isPinned ? (
          <Pin size={13} className="shrink-0 text-amber-500" />
        ) : (
          <MessageSquare size={14} className="shrink-0 opacity-50" />
        )}
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <TitleEditor
              value={s.title}
              onSave={(title) => { onUpdate(s.id, { title }); setEditingId(null); }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <>
              <p className="truncate text-sm">{s.title}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{formatDate(s.createdAt)}</p>
            </>
          )}
        </div>

        {/* Action buttons — visible on hover */}
        {!isEditing && (
          <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setEditingId(s.id); }}
              className="rounded p-1 hover:bg-[var(--accent)] hover:text-teal-600"
              title="Đổi tên"
            >
              <Pencil size={12} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onUpdate(s.id, { isPinned: !s.isPinned }); }}
              className="rounded p-1 hover:bg-[var(--accent)] hover:text-amber-600"
              title={s.isPinned ? "Bỏ ghim" : "Ghim"}
            >
              {s.isPinned ? <PinOff size={12} /> : <Pin size={12} />}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
              className="rounded p-1 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
              title="Xóa"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
    );
  }

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

        {/* Pinned section */}
        {pinned.length > 0 && (
          <>
            <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Đã ghim
            </p>
            {pinned.map(renderSession)}
          </>
        )}

        {/* Regular section */}
        {unpinned.length > 0 && pinned.length > 0 && (
          <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Gần đây
          </p>
        )}
        {unpinned.map(renderSession)}
      </div>
    </div>
  );
}
