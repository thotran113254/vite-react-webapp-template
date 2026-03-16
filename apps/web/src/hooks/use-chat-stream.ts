import { useState, useCallback, useRef, useEffect } from "react";
import type { ChatMessage } from "@app/shared";

const ACCESS_TOKEN_KEY = "access_token";

/** Interval (ms) between UI flushes — 50ms = 20fps, smooth enough without excessive re-renders */
const FLUSH_INTERVAL_MS = 50;

interface UseChatStreamOptions {
  /** Called when stream finishes with the saved assistant message */
  onComplete?: (userMsg: ChatMessage, assistantMsg: ChatMessage) => void;
  onError?: (error: string) => void;
}

interface UseChatStreamReturn {
  send: (sessionId: string, content: string) => void;
  /** Buffered streaming text displayed to user (flushed at ~20fps) */
  streamingText: string;
  isStreaming: boolean;
  error: string | null;
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

  const send = useCallback((sessionId: string, content: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Reset state
    accumulatedRef.current = "";
    flushedLenRef.current = 0;
    setStreamingText("");
    setIsStreaming(true);
    setError(null);

    const baseUrl = import.meta.env.VITE_API_URL ?? "/api/v1";
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);

    fetch(`${baseUrl}/chat/sessions/${sessionId}/messages/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ content }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let sseBuffer = "";
        let userMsg: ChatMessage | null = null;

        // Start periodic flushing once we begin receiving data
        startFlushing();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });

          // Parse SSE lines
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() ?? "";

          let currentEvent = "";
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
                } else if (currentEvent === "ai-complete") {
                  // Final flush before completing
                  flushRemaining();
                  const assistantMsg = data as ChatMessage;
                  if (userMsg) onComplete?.(userMsg, assistantMsg);
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

        // Ensure final content is flushed if stream ends without ai-complete
        flushRemaining();
      })
      .catch((err) => {
        stopFlushing();
        if (err instanceof Error && err.name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "Stream failed";
        setError(msg);
        onError?.(msg);
      })
      .finally(() => {
        stopFlushing();
        setIsStreaming(false);
      });
  }, [onComplete, onError]);

  return { send, streamingText, isStreaming, error };
}
