import { Coins } from "lucide-react";
import type { TokenUsageInfo } from "@/hooks/use-chat-stream";

interface ChatTokenUsageProps {
  usage: TokenUsageInfo;
}

function fmt(usd: number): string {
  if (usd === 0) return "$0";
  if (usd < 0.0001) return "<$0.0001";
  return `$${usd.toFixed(4)}`;
}

/** Compact display of token usage breakdown and cost per message. */
export function ChatTokenUsage({ usage }: ChatTokenUsageProps) {
  const { tokenUsage: t, estimatedCost: c } = usage;

  return (
    <div className="space-y-1 rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
      {/* Token breakdown */}
      <div className="flex items-center gap-1">
        <Coins size={11} className="shrink-0 opacity-60" />
        <span className="font-medium text-gray-600 dark:text-gray-300">Tokens:</span>
        <span>Input {t.promptTokens.toLocaleString()}</span>
        {t.cachedTokens > 0 && <span>(cached: {t.cachedTokens.toLocaleString()})</span>}
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
      </div>
      {/* Cost breakdown */}
      <div className="flex items-center gap-1">
        <span className="ml-3.5 font-medium text-gray-600 dark:text-gray-300">Chi phí:</span>
        <span>Input {fmt(c.inputCost)}</span>
        {c.cachedCost > 0 && <span>+ Cached {fmt(c.cachedCost)}</span>}
        <span>+ Output {fmt(c.outputCost)}</span>
        {c.thinkingCost > 0 && <span>+ Thinking {fmt(c.thinkingCost)}</span>}
        <span>=</span>
        <span className="font-semibold text-teal-600 dark:text-teal-400">{fmt(c.totalCost)}</span>
      </div>
    </div>
  );
}
