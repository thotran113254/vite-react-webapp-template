import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChatMessageBubble } from "@/components/chat/chat-message-bubble";
import type { ChatMessage } from "@app/shared";

interface AdminChatSession {
  id: string;
  userId: string;
  userName: string;
  title: string;
  createdAt: string;
  lastMessageAt: string | null;
  messageCount: number;
}

interface Props {
  session: AdminChatSession | null;
  onClose: () => void;
}

async function fetchMessages(sessionId: string): Promise<ChatMessage[]> {
  const res = await apiClient.get(`/admin/analytics/sessions/${sessionId}/messages`);
  return res.data.data as ChatMessage[];
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Read-only chat session viewer for admin — reuses ChatMessageBubble */
export function ChatSessionViewerDialog({ session, onClose }: Props) {
  const { data: messages, isLoading } = useQuery({
    queryKey: ["admin-session-messages", session?.id],
    queryFn: () => fetchMessages(session!.id),
    enabled: !!session,
  });

  return (
    <Dialog open={!!session} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-base">{session?.title ?? "Chat"}</DialogTitle>
          {session && (
            <div className="flex gap-4 text-xs text-[var(--muted-foreground)]">
              <span>Nhân viên: <strong>{session.userName}</strong></span>
              <span>Bắt đầu: {formatDateTime(session.createdAt)}</span>
              <span>{session.messageCount} tin nhắn</span>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--background)] p-4">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-sm text-[var(--muted-foreground)]">
              Đang tải tin nhắn...
            </div>
          ) : !messages?.length ? (
            <div className="flex h-32 items-center justify-center text-sm text-[var(--muted-foreground)]">
              Phiên chat trống.
            </div>
          ) : (
            <div className="space-y-4">
              {messages
                .filter((msg) => msg.role === "user" || msg.role === "assistant")
                .map((msg) => {
                  const meta = msg.metadata as Record<string, unknown>;
                  const images = Array.isArray(meta?.images) ? (meta.images as string[]) : undefined;
                  return (
                    <ChatMessageBubble
                      key={msg.id}
                      role={msg.role as "user" | "assistant"}
                      content={msg.content}
                      createdAt={msg.createdAt}
                      images={images}
                    />
                  );
                })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
