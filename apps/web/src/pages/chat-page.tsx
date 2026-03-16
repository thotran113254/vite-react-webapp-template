import { useEffect, useRef, useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useChatStream } from "@/hooks/use-chat-stream";
import { ChatMessageBubble } from "@/components/chat/chat-message-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatSuggestionChips } from "@/components/chat/chat-suggestion-chips";
import { ChatSessionSidebar } from "@/components/chat/chat-session-sidebar";
import { ChatTokenUsage } from "@/components/chat/chat-token-usage";
import type { ChatSession, ChatMessage } from "@app/shared";

interface ApiList<T> { data: T[] }
interface ApiItem<T> { data: T }

async function fetchSessions(): Promise<ChatSession[]> {
  const res = await apiClient.get<ApiList<ChatSession>>("/chat/sessions");
  return res.data.data;
}

async function fetchMessages(sessionId: string): Promise<ChatMessage[]> {
  const res = await apiClient.get<ApiList<ChatMessage>>(
    `/chat/sessions/${sessionId}/messages`,
  );
  return res.data.data;
}

/** Full-page AI travel assistant chat with session management + SSE streaming. */
export default function ChatPage() {
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Fetch all sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ["chat-sessions"],
    queryFn: fetchSessions,
  });

  // Auto-select first session if none active
  useEffect(() => {
    if (!activeSessionId && sessions.length > 0) {
      setActiveSessionId(sessions[0]!.id);
    }
  }, [sessions, activeSessionId]);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  // Fetch messages for active session
  const { data: serverMessages = [] } = useQuery({
    queryKey: ["chat-messages", activeSessionId],
    queryFn: () => fetchMessages(activeSessionId!),
    enabled: !!activeSessionId,
  });

  // Create new session
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<ApiItem<ChatSession>>("/chat/sessions", {
        title: "Cuộc hội thoại mới",
      });
      return res.data.data;
    },
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
      setActiveSessionId(newSession.id);
    },
  });

  // Delete session
  const deleteMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await apiClient.delete(`/chat/sessions/${sessionId}`);
      return sessionId;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
      if (activeSessionId === deletedId) {
        const remaining = sessions.filter((s) => s.id !== deletedId);
        setActiveSessionId(remaining.length > 0 ? remaining[0]!.id : null);
      }
    },
  });

  // Streaming
  const onStreamComplete = useCallback(
    (userMsg: ChatMessage, assistantMsg: ChatMessage) => {
      queryClient.setQueryData<ChatMessage[]>(
        ["chat-messages", activeSessionId],
        (prev = []) => [...prev, userMsg, assistantMsg],
      );
    },
    [queryClient, activeSessionId],
  );

  const { send, streamingText, isStreaming, error, lastUsage, pendingUserMessage } = useChatStream({
    onComplete: onStreamComplete,
  });

  function handleSend(content: string) {
    if (!activeSessionId || isStreaming) return;
    send(activeSessionId, content);
  }

  function handleSelectSession(session: ChatSession) {
    if (isStreaming) return;
    setActiveSessionId(session.id);
  }

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [serverMessages.length, streamingText]);

  return (
    <div className="flex h-full -m-6">
      {/* Session sidebar */}
      {sidebarOpen && (
        <ChatSessionSidebar
          sessions={sessions}
          activeSessionId={activeSessionId ?? undefined}
          onSelect={handleSelectSession}
          onNew={() => createMutation.mutate()}
          onDelete={(id) => deleteMutation.mutate(id)}
          isCreating={createMutation.isPending}
        />
      )}

      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        {/* Chat header */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-4 py-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
            aria-label={sidebarOpen ? "Ẩn sidebar" : "Hiện sidebar"}
          >
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600">
            <Bot size={16} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--foreground)]">
              {activeSession?.title ?? "Trợ lý AI"}
            </p>
            <span className="inline-flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
              Online
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mx-auto max-w-2xl space-y-4">
            {!activeSessionId && (
              <div className="py-16 text-center text-sm text-[var(--muted-foreground)]">
                Tạo cuộc hội thoại mới để bắt đầu
              </div>
            )}
            {activeSessionId && serverMessages.length === 0 && !isStreaming && (
              <div className="py-16 text-center text-sm text-[var(--muted-foreground)]">
                Bắt đầu cuộc trò chuyện về khách sạn và du lịch
              </div>
            )}
            {serverMessages.map((msg) => {
              const meta = msg.metadata as Record<string, unknown> | undefined;
              const savedUsage = meta?.tokenUsage && meta?.estimatedCost
                ? { tokenUsage: meta.tokenUsage, estimatedCost: meta.estimatedCost } as import("@/hooks/use-chat-stream").TokenUsageInfo
                : null;
              return (
                <div key={msg.id}>
                  <ChatMessageBubble
                    role={msg.role === "system" ? "assistant" : msg.role}
                    content={msg.content}
                    createdAt={msg.createdAt}
                  />
                  {savedUsage && <ChatTokenUsage usage={savedUsage} />}
                </div>
              );
            })}
            {/* User message shown immediately while waiting for AI */}
            {pendingUserMessage && (
              <ChatMessageBubble
                role="user"
                content={pendingUserMessage.content}
                createdAt={pendingUserMessage.createdAt}
              />
            )}
            {isStreaming && streamingText && (
              <ChatMessageBubble
                role="assistant"
                content={streamingText}
                createdAt={new Date().toISOString()}
              />
            )}
            {isStreaming && !streamingText && (
              <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-teal-400 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-teal-400 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-teal-400 [animation-delay:300ms]" />
                </div>
                AI đang trả lời...
              </div>
            )}
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                Không thể nhận phản hồi từ AI. Vui lòng thử lại.
              </div>
            )}
            {/* Token usage for streaming message (before it's saved to server) */}
            {!isStreaming && lastUsage && !serverMessages.some(m => (m.metadata as Record<string,unknown>)?.tokenUsage) && (
              <ChatTokenUsage usage={lastUsage} />
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[var(--border)] bg-[var(--card)] px-4 pb-4 pt-3">
          <div className="mx-auto max-w-2xl space-y-3">
            {activeSessionId && serverMessages.length === 0 && !isStreaming && (
              <ChatSuggestionChips onSelect={handleSend} />
            )}
            <ChatInput onSend={handleSend} disabled={isStreaming || !activeSessionId} />
            <p className="text-center text-[10px] text-[var(--muted-foreground)]">
              AI có thể mắc sai sót. Vui lòng xác minh thông tin quan trọng trước khi đặt phòng.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
