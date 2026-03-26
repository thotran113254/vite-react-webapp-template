import { useEffect, useRef, useCallback, useState, type UIEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, PanelLeftOpen, PanelLeftClose, Copy, Check } from "lucide-react";
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

/** Tiny button to copy session ID for debugging */
function SessionIdCopy({ sessionId }: { sessionId: string }) {
  const [copied, setCopied] = useState(false);
  const shortId = sessionId.slice(0, 8);
  return (
    <button
      type="button"
      title={`Copy Session ID: ${sessionId}`}
      onClick={() => { navigator.clipboard.writeText(sessionId); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
    >
      {shortId}
      {copied ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
    </button>
  );
}

const TOOL_LABELS: Record<string, string> = {
  getMarketOverview: "thông tin thị trường",
  getMarketPricing: "bảng giá",
  getMarketAttractions: "điểm du lịch",
  getItineraryTemplates: "lịch trình mẫu",
  getMarketBusinessData: "dữ liệu kinh doanh",
  searchKnowledgeBase: "knowledge base",
};

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  /** Track if user is near bottom — only auto-scroll when true */
  const isNearBottomRef = useRef(true);

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

  // Update session (rename / pin)
  const updateMutation = useMutation({
    mutationFn: async ({ sessionId, updates }: { sessionId: string; updates: { title?: string; isPinned?: boolean } }) => {
      const res = await apiClient.patch<ApiItem<ChatSession>>(`/chat/sessions/${sessionId}`, updates);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
    },
  });

  function handleUpdateSession(sessionId: string, updates: { title?: string; isPinned?: boolean }) {
    updateMutation.mutate({ sessionId, updates });
  }

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

  const { send, streamingText, isStreaming, error, lastUsage, pendingUserMessage, toolCalls } = useChatStream({
    onComplete: onStreamComplete,
  });

  // Sync messages + sessions from server when streaming ends
  const prevStreamingRef = useRef(false);
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming && activeSessionId) {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", activeSessionId] });
      // Refresh session list to pick up auto-generated titles
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, activeSessionId, queryClient]);

  function handleSend(content: string, images?: string[]) {
    if (!activeSessionId || isStreaming) return;
    send(activeSessionId, content, images);
  }

  function handleSelectSession(session: ChatSession) {
    if (isStreaming) return;
    setActiveSessionId(session.id);
  }

  /** Check if scroll container is near bottom (within 100px) */
  function handleScroll(e: UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }

  /** Scroll to bottom — instant for new messages, no-op if user scrolled up */
  function scrollToBottom(force?: boolean) {
    if (!force && !isNearBottomRef.current) return;
    bottomRef.current?.scrollIntoView({ behavior: force ? "instant" : "smooth" });
  }

  // Force scroll when session changes or new messages load
  useEffect(() => {
    isNearBottomRef.current = true;
    scrollToBottom(true);
  }, [activeSessionId]);

  // Scroll on new server messages (user sent or AI complete)
  useEffect(() => { scrollToBottom(true); }, [serverMessages.length]);

  // Scroll during streaming — only if user is near bottom
  useEffect(() => { scrollToBottom(); }, [streamingText]);

  // Scroll when pending user message appears
  useEffect(() => {
    if (pendingUserMessage) scrollToBottom(true);
  }, [pendingUserMessage]);

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
          onUpdate={handleUpdateSession}
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
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600">
            <Bot size={16} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--foreground)]">
              {activeSession?.title ?? "Trợ lý AI"}
            </p>
            <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              Online
            </span>
          </div>
          {/* Session ID copy button for debugging */}
          {activeSessionId && <SessionIdCopy sessionId={activeSessionId} />}
        </div>

        {/* Messages */}
        <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4">
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
              const msgImages = meta?.images as string[] | undefined;
              const hadImages = !msgImages?.length && meta?.hasImages === true;
              const savedUsage = meta?.costBreakdown
                ? {
                    costBreakdown: meta.costBreakdown,
                    turn: meta.turn as number | undefined,
                    durationMs: meta.durationMs as number | undefined,
                    hasThinking: meta.hasThinking as boolean | undefined,
                  } as import("@/hooks/use-chat-stream").TokenUsageInfo
                : null;
              return (
                <div key={msg.id}>
                  <ChatMessageBubble
                    role={msg.role === "system" ? "assistant" : msg.role}
                    content={msg.content}
                    createdAt={msg.createdAt}
                    images={msgImages}
                    hadImages={hadImages}
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
                images={pendingUserMessage.images}
              />
            )}
            {isStreaming && streamingText && (
              <ChatMessageBubble
                role="assistant"
                content={streamingText}
                createdAt={new Date().toISOString()}
              />
            )}
            {/* Tool call indicator — amber, shows during data retrieval */}
            {isStreaming && !streamingText && toolCalls.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-amber-400 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-amber-400 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-amber-400 [animation-delay:300ms]" />
                </div>
                Đang tra cứu {TOOL_LABELS[toolCalls[toolCalls.length - 1]?.toolName ?? ""] ?? "dữ liệu"}...
              </div>
            )}

            {/* Default thinking indicator — blue */}
            {isStreaming && !streamingText && toolCalls.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:300ms]" />
                </div>
                AI đang xử lý...
              </div>
            )}
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                Không thể nhận phản hồi từ AI: {error}
              </div>
            )}
            {/* Token usage for streaming message (before it's saved to server) */}
            {!isStreaming && lastUsage && !serverMessages.some(m => (m.metadata as Record<string,unknown>)?.costBreakdown) && (
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
