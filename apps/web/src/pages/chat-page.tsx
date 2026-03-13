import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { ChatMessageBubble } from "@/components/chat/chat-message-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatSuggestionChips } from "@/components/chat/chat-suggestion-chips";
import type { ChatSession, ChatMessage, SendMessageDto } from "@app/shared";

// Axios wraps the response body in res.data, so the actual API body is res.data
// API body shape: { data: T }  (project's ApiResponse<T> wrapper)
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

async function sendMessage(sessionId: string, dto: SendMessageDto): Promise<ChatMessage[]> {
  // The API returns both the user message and the AI reply in an array
  const res = await apiClient.post<ApiList<ChatMessage>>(
    `/chat/sessions/${sessionId}/messages`,
    dto,
  );
  return res.data.data;
}

/** Full-page AI travel assistant chat interface. */
export default function ChatPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);

  const { data: session } = useQuery({
    queryKey: ["chat-session"],
    queryFn: fetchOrCreateSession,
  });

  const { data: serverMessages = [] } = useQuery({
    queryKey: ["chat-messages", session?.id],
    queryFn: () => fetchMessages(session!.id),
    enabled: !!session?.id,
  });

  const allMessages = [...serverMessages, ...optimisticMessages];

  const mutation = useMutation({
    mutationFn: (content: string) => sendMessage(session!.id, { content }),
    onSuccess: (newMessages) => {
      setOptimisticMessages([]);
      queryClient.setQueryData<ChatMessage[]>(
        ["chat-messages", session?.id],
        (prev = []) => [...prev, ...newMessages],
      );
    },
  });

  function handleSend(content: string) {
    if (!session || mutation.isPending) return;
    const now = new Date().toISOString();
    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      sessionId: session.id,
      role: "user",
      content,
      metadata: {},
      createdAt: now,
    };
    setOptimisticMessages([tempMsg]);
    mutation.mutate(content);
  }

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages.length]);

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
          {allMessages.length === 0 && (
            <div className="py-16 text-center text-sm text-[var(--muted-foreground)]">
              Bắt đầu cuộc trò chuyện về khách sạn và du lịch
            </div>
          )}
          {allMessages.map((msg) => (
            <ChatMessageBubble
              key={msg.id}
              role={msg.role === "system" ? "assistant" : msg.role}
              content={msg.content}
              createdAt={msg.createdAt}
            />
          ))}
          {mutation.isPending && (
            <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-teal-400 [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-teal-400 [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-teal-400 [animation-delay:300ms]" />
              </div>
              AI đang trả lời...
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[var(--border)] bg-[var(--card)] px-4 pb-4 pt-3">
        <div className="mx-auto max-w-2xl space-y-3">
          <ChatSuggestionChips onSelect={handleSend} />
          <ChatInput onSend={handleSend} disabled={mutation.isPending || !session} />
          <p className="text-center text-[10px] text-[var(--muted-foreground)]">
            AI có thể mắc sai sót. Vui lòng xác minh thông tin quan trọng trước khi đặt phòng.
          </p>
        </div>
      </div>
    </div>
  );
}
