import { Coins, Clock, Zap, Brain, Wrench } from "lucide-react";
import type { TokenUsageInfo, ModelUsageInfo } from "@/hooks/use-chat-stream";

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

/** Short model label for display */
function modelLabel(model: string): string {
  if (model.includes("flash-lite")) return "Flash Lite";
  if (model.includes("3-flash")) return "3 Flash";
  return model.split("-").slice(-2).join(" ");
}

function hasTokens(m: ModelUsageInfo): boolean {
  return m.tokens.totalTokens > 0;
}

/** Single model token line */
function ModelTokenLine({ m }: { m: ModelUsageInfo }) {
  const t = m.tokens;
  return (
    <div className="flex items-center gap-1">
      <span className="shrink-0 font-medium text-gray-600 dark:text-gray-300">{modelLabel(m.model)}</span>
      <span className="text-gray-300 dark:text-gray-600">—</span>
      <span>In {t.promptTokens.toLocaleString()}{t.cachedTokens > 0 ? ` (${t.cachedTokens.toLocaleString()} cached)` : ""}</span>
      <span className="text-gray-300 dark:text-gray-600">|</span>
      <span>Out {t.responseTokens.toLocaleString()}</span>
      {t.thinkingTokens > 0 && (
        <>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span>Think {t.thinkingTokens.toLocaleString()}</span>
        </>
      )}
      <span className="ml-auto text-blue-600 dark:text-blue-400">{fmt(m.cost.totalCost)}</span>
    </div>
  );
}

/** Compact display of processing info, token usage, and cost per message. */
export function ChatTokenUsage({ usage }: ChatTokenUsageProps) {
  const bd = usage.costBreakdown;
  if (!bd) return null;

  const showCheap = hasTokens(bd.cheap);

  return (
    <div className="space-y-1 rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
      {/* Processing info: turn, duration, features, tool rounds */}
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
        {bd.toolRounds > 0 && (
          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <Wrench size={10} />
            {bd.toolRounds} tool round{bd.toolRounds > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Per-model token breakdown */}
      <div className="space-y-0.5">
        <ModelTokenLine m={bd.main} />
        {showCheap && <ModelTokenLine m={bd.cheap} />}
      </div>

      {/* Total cost */}
      <div className="flex items-center gap-1 border-t border-gray-200 pt-1 dark:border-gray-700">
        <Coins size={11} className="shrink-0 opacity-60" />
        <span>Tổng chi phí</span>
        <span className="ml-auto font-semibold text-blue-600 dark:text-blue-400">{fmt(bd.totalCost)}</span>
      </div>
    </div>
  );
}
