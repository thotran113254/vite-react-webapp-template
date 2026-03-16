import { Coins, Clock, Zap, Database, Brain } from "lucide-react";
import type { TokenUsageInfo } from "@/hooks/use-chat-stream";

interface ChatTokenUsageProps {
  usage: TokenUsageInfo;
}

function fmt(usd: number): string {
  if (usd === 0) return "$0";
  if (usd < 0.0001) return "<$0.0001";
  return `$${usd.toFixed(4)}`;
}

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Compact display of processing info, token usage, and cost per message. */
export function ChatTokenUsage({ usage }: ChatTokenUsageProps) {
  const { tokenUsage: t, estimatedCost: c } = usage;

  return (
    <div className="space-y-1 rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
      {/* Processing info: turn, duration, features */}
      <div className="flex items-center gap-2">
        {usage.turn != null && (
          <span className="inline-flex items-center gap-1">
            <Zap size={10} className="text-amber-500" />
            Turn {usage.turn}
          </span>
        )}
        {usage.durationMs != null && (
          <span className="inline-flex items-center gap-1">
            <Clock size={10} className="opacity-60" />
            {fmtDuration(usage.durationMs)}
          </span>
        )}
        {usage.hasThinking && (
          <span className="inline-flex items-center gap-1 text-purple-500">
            <Brain size={10} />
            Thinking
          </span>
        )}
        {usage.hasCachedContext && (
          <span className="inline-flex items-center gap-1 text-blue-500">
            <Database size={10} />
            Cached
          </span>
        )}
      </div>
      {/* Token breakdown */}
      <div className="flex items-center gap-1">
        <Coins size={11} className="shrink-0 opacity-60" />
        <span>Input {t.promptTokens.toLocaleString()}{t.cachedTokens > 0 ? ` (${t.cachedTokens.toLocaleString()} cached)` : ""}</span>
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <span>Output {t.responseTokens.toLocaleString()}</span>
        {t.thinkingTokens > 0 && (
          <>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span>Thinking {t.thinkingTokens.toLocaleString()}</span>
          </>
        )}
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <span>Tổng <b className="font-medium text-gray-600 dark:text-gray-300">{t.totalTokens.toLocaleString()}</b></span>
        <span className="ml-auto font-semibold text-teal-600 dark:text-teal-400">{fmt(c.totalCost)}</span>
      </div>
    </div>
  );
}
