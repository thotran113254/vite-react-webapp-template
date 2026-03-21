import { useState, useCallback, useRef, useEffect } from "react";
import type { ChatMessage } from "@app/shared";

export interface ToolCallInfo {
  toolName: string;
  args: Record<string, unknown>;
  usedSkill: boolean;
}

const ACCESS_TOKEN_KEY = "access_token";

/** Interval (ms) between UI flushes — 50ms = 20fps, smooth enough without excessive re-renders */
const FLUSH_INTERVAL_MS = 50;

interface TokenBreakdown {
  promptTokens: number;
  responseTokens: number;
  thinkingTokens: number;
  cachedTokens: number;
  totalTokens: number;
}

interface CostBreakdown {
  inputCost: number;
  cachedCost: number;
  outputCost: number;
  thinkingCost: number;
  totalCost: number;
}

export interface ModelUsageInfo {
  model: string;
  tokens: TokenBreakdown;
  cost: CostBreakdown;
}

export interface CostBreakdownInfo {
  main: ModelUsageInfo;
  cheap: ModelUsageInfo;
  toolRounds: number;
  totalCost: number;
}

export interface TokenUsageInfo {
  costBreakdown: CostBreakdownInfo;
  /** Conversation turn number (1-based) */
  turn?: number;
  /** Processing duration in ms */
  durationMs?: number;
  /** Whether thinking mode was used */
  hasThinking?: boolean;
}

interface UseChatStreamOptions {
  /** Called when stream finishes with the saved assistant message */
  onComplete?: (userMsg: ChatMessage, assistantMsg: ChatMessage, usage?: TokenUsageInfo) => void;
  onError?: (error: string) => void;
}

interface UseChatStreamReturn {
  send: (sessionId: string, content: string, images?: string[]) => void;
  /** Buffered streaming text displayed to user (flushed at ~20fps) */
  streamingText: string;
  isStreaming: boolean;
  error: string | null;
  /** Token usage from last completed message */
  lastUsage: TokenUsageInfo | null;
  /** Optimistic user message shown immediately while waiting for SSE */
  pendingUserMessage: (ChatMessage & { images?: string[] }) | null;
  /** Tool calls fired during the current streaming response */
  toolCalls: ToolCallInfo[];
}

/**
 * Hook that streams AI chat responses via SSE.
 * Uses a buffered flush strategy: incoming tokens are accumulated in a ref
 * and flushed to React state at a fixed interval for smooth rendering.
 */
export function useChatStream({ onComplete, onError }: UseChatStreamOptions = {}): UseChatStreamReturn {
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUsage, setLastUsage] = useState<TokenUsageInfo | null>(null);
  const [pendingUserMessage, setPendingUserMessage] = useState<ChatMessage | null>(null);
  const [toolCalls, setToolCalls] = useState<ToolCallInfo[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  // Buffer: raw accumulated text that hasn't been flushed to state yet
  const accumulatedRef = useRef("");
  // Track what's already been flushed to avoid unnecessary setState
  const flushedLenRef = useRef(0);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Start periodic flush: push accumulated text to React state at fixed interval */
  function startFlushing() {
    stopFlushing();
    flushTimerRef.current = setInterval(() => {
      // Only update state if new text has arrived since last flush
      if (accumulatedRef.current.length > flushedLenRef.current) {
        flushedLenRef.current = accumulatedRef.current.length;
        setStreamingText(accumulatedRef.current);
      }
    }, FLUSH_INTERVAL_MS);
  }

  function stopFlushing() {
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }

  /** Final flush — ensure all remaining text is rendered */
  function flushRemaining() {
    stopFlushing();
    if (accumulatedRef.current.length > flushedLenRef.current) {
      setStreamingText(accumulatedRef.current);
    }
  }

  // Cleanup on unmount
  useEffect(() => () => stopFlushing(), []);

  const send = useCallback((sessionId: string, content: string, images?: string[]) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Reset state
    accumulatedRef.current = "";
    flushedLenRef.current = 0;
    setStreamingText("");
    setIsStreaming(true);
    setError(null);
    setToolCalls([]);
    let completed = false;

    // Show user message immediately (optimistic) — include images for display
    setPendingUserMessage({
      id: `pending-${Date.now()}`,
      sessionId,
      role: "user",
      content,
      metadata: {},
      createdAt: new Date().toISOString(),
      ...(images?.length ? { images } : {}),
    });

    const baseUrl = import.meta.env.VITE_API_URL ?? "/api/v1";
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);

    fetch(`${baseUrl}/chat/sessions/${sessionId}/messages/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ content, ...(images?.length ? { images } : {}) }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let sseBuffer = "";
        let userMsg: ChatMessage | null = null;
        // Persist across chunks so event: in one chunk pairs with data: in the next
        let currentEvent = "";

        startFlushing();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });

          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              const dataStr = line.slice(5).trim();
              if (!dataStr) continue;

              try {
                const data = JSON.parse(dataStr);

                if (currentEvent === "user-message") {
                  userMsg = data as ChatMessage;
                } else if (currentEvent === "ai-chunk") {
                  // Accumulate in ref — UI will pick it up on next flush tick
                  accumulatedRef.current += data.text;
                } else if (currentEvent === "tool-call") {
                  const toolData = data as ToolCallInfo;
                  setToolCalls((prev) => [...prev, toolData]);
                } else if (currentEvent === "ai-complete") {
                  completed = true;
                  flushRemaining();
                  const { costBreakdown, turn, durationMs, hasThinking, ...msgData } = data;
                  const assistantMsg = msgData as ChatMessage;
                  const usage = costBreakdown
                    ? { costBreakdown, turn, durationMs, hasThinking } as TokenUsageInfo
                    : undefined;
                  if (usage) setLastUsage(usage);
                  // Batch all cleanup + query update in one React render cycle
                  setToolCalls([]);
                  setPendingUserMessage(null);
                  setStreamingText("");
                  setIsStreaming(false);
                  if (userMsg) onComplete?.(userMsg, assistantMsg, usage);
                } else if (currentEvent === "error") {
                  throw new Error(data.error ?? "Stream error");
                }
              } catch (e) {
                if (e instanceof SyntaxError) continue;
                throw e;
              }
            }
          }
        }

        // Only flush if ai-complete was never received (abnormal stream end)
        if (!completed) flushRemaining();
      })
      .catch((err) => {
        stopFlushing();
        if (err instanceof Error && err.name === "AbortError") return;
        setPendingUserMessage(null);
        const msg = err instanceof Error ? err.message : "Stream failed";
        setError(msg);
        onError?.(msg);
      })
      .finally(() => {
        stopFlushing();
        // Safety net: only reset if ai-complete handler didn't already do it
        if (!completed) {
          setIsStreaming(false);
          setPendingUserMessage(null);
        }
      });
  }, [onComplete, onError]);

  return { send, streamingText, isStreaming, error, lastUsage, pendingUserMessage, toolCalls };
}
