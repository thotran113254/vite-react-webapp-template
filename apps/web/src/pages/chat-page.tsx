import { useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { useChatStream } from "@/hooks/use-chat-stream";
import { ChatMessageBubble } from "@/components/chat/chat-message-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatSuggestionChips } from "@/components/chat/chat-suggestion-chips";
import type { ChatSession, ChatMessage, SendMessageDto } from "@app/shared";

interface ApiList<T> { data: T[] }
interface ApiItem<T> { data: T }

async function fetchOrCreateSession(): Promise<ChatSession> {
  const res = await apiClient.get<ApiList<ChatSession>>("/chat/sessions");
  const sessions = res.data.data;
  if (sessions.length > 0) return sessions[0] as ChatSession;
  const created = await apiClient.post<ApiItem<ChatSession>>("/chat/sessions", {
    title: "Cuộc hội thoại mới",
  });
  return created.data.data;
}

async function fetchMessages(sessionId: string): Promise<ChatMessage[]> {
  const res = await apiClient.get<ApiList<ChatMessage>>(
    `/chat/sessions/${sessionId}/messages`,
  );
  return res.data.data;
}

/** Full-page AI travel assistant chat interface with SSE streaming. */
export default function ChatPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: session } = useQuery({
    queryKey: ["chat-session"],
    queryFn: fetchOrCreateSession,
  });

  const { data: serverMessages = [] } = useQuery({
    queryKey: ["chat-messages", session?.id],
    queryFn: () => fetchMessages(session!.id),
    enabled: !!session?.id,
  });

  const onStreamComplete = useCallback(
    (userMsg: ChatMessage, assistantMsg: ChatMessage) => {
      queryClient.setQueryData<ChatMessage[]>(
        ["chat-messages", session?.id],
        (prev = []) => [...prev, userMsg, assistantMsg],
      );
    },
    [queryClient, session?.id],
  );

  const { send, streamingText, isStreaming, error } = useChatStream({
    onComplete: onStreamComplete,
  });

  function handleSend(content: string) {
    if (!session || isStreaming) return;
    send(session.id, content);
  }

  // Scroll to bottom on new messages or streaming text
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [serverMessages.length, streamingText]);

  return (
    <div className="flex h-full flex-col -m-6">
      {/* Chat header */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600">
          <Bot size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">Trợ lý AI</p>
          <span className="inline-flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
            Online
          </span>
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {serverMessages.length === 0 && !isStreaming && (
            <div className="py-16 text-center text-sm text-[var(--muted-foreground)]">
              Bắt đầu cuộc trò chuyện về khách sạn và du lịch
            </div>
          )}
          {serverMessages.map((msg) => (
            <ChatMessageBubble
              key={msg.id}
              role={msg.role === "system" ? "assistant" : msg.role}
              content={msg.content}
              createdAt={msg.createdAt}
            />
          ))}
          {/* Streaming AI response — shown as a live-updating bubble */}
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
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[var(--border)] bg-[var(--card)] px-4 pb-4 pt-3">
        <div className="mx-auto max-w-2xl space-y-3">
          <ChatSuggestionChips onSelect={handleSend} />
          <ChatInput onSend={handleSend} disabled={isStreaming || !session} />
          <p className="text-center text-[10px] text-[var(--muted-foreground)]">
            AI có thể mắc sai sót. Vui lòng xác minh thông tin quan trọng trước khi đặt phòng.
          </p>
        </div>
      </div>
    </div>
  );
}
