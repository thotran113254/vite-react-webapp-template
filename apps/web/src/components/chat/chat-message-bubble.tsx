import { useState } from "react";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "./markdown-renderer";

interface ChatMessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  /** Base64 image data URLs attached to this message */
  images?: string[];
  /** Legacy flag: message had images but data wasn't saved (pre-fix messages) */
  hadImages?: boolean;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Lightbox overlay for full-size image viewing */
function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <img
        src={src}
        alt=""
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

/** Resolve image source — base64 data URLs pass through, URL paths get API prefix */
function resolveImageSrc(src: string): string {
  if (src.startsWith("data:")) return src;
  // URL path from server (e.g., /uploads/chat-images/abc.jpg)
  const base = import.meta.env.VITE_API_URL?.replace(/\/api\/v1$/, "") ?? "";
  return `${base}${src}`;
}

/** Renders a single chat message aligned by role with avatar, timestamp, and optional images. */
export function ChatMessageBubble({ role, content, createdAt, images, hadImages }: ChatMessageBubbleProps) {
  const isAssistant = role === "assistant";
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const hasImages = images && images.length > 0;
  const isImageOnly = hasImages && content === "(Ảnh đính kèm)";
  const isEmpty = !content || content.trim() === "";

  return (
    <>
      <div
        className={cn(
          "flex gap-2.5",
          isAssistant ? "flex-row" : "flex-row-reverse",
        )}
      >
        {/* Avatar */}
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            isAssistant ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
          )}
        >
          {isAssistant ? <Bot size={16} /> : <User size={16} />}
        </div>

        {/* Bubble + images + timestamp */}
        <div
          className={cn(
            "flex max-w-[75%] flex-col gap-1",
            isAssistant ? "items-start" : "items-end",
          )}
        >
          {/* Images grid */}
          {hasImages && (
            <div className={cn(
              "flex flex-wrap gap-1.5",
              images.length === 1 ? "max-w-xs" : "max-w-sm",
            )}>
              {images.map((img, i) => (
                <img
                  key={i}
                  src={resolveImageSrc(img)}
                  alt=""
                  onClick={() => setLightboxSrc(resolveImageSrc(img))}
                  className={cn(
                    "cursor-pointer rounded-xl border border-[var(--border)] object-cover transition-opacity hover:opacity-90",
                    images.length === 1
                      ? "max-h-64 w-full rounded-xl"
                      : "h-28 w-28 rounded-lg",
                  )}
                />
              ))}
            </div>
          )}

          {/* Legacy: message had images but data wasn't saved */}
          {!hasImages && hadImages && (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--accent)]/50 px-3 py-2 text-xs text-[var(--muted-foreground)]">
              Ảnh đính kèm (không còn khả dụng)
            </div>
          )}

          {/* Text bubble — skip if image-only, show placeholder for empty assistant response */}
          {isEmpty && isAssistant ? (
            <div className="rounded-2xl rounded-tl-sm bg-blue-50 px-4 py-2.5 text-sm italic text-gray-400 dark:bg-blue-900/40 dark:text-gray-500">
              (AI không phản hồi được — có thể do ảnh không được gửi đúng cách)
            </div>
          ) : !isImageOnly && !isEmpty ? (
            <div
              className={cn(
                "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                isAssistant
                  ? "rounded-tl-sm bg-blue-50 text-gray-800 dark:bg-blue-900/40 dark:text-gray-200"
                  : "rounded-tr-sm bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
              )}
            >
              {isAssistant ? <MarkdownRenderer content={content} /> : content}
            </div>
          ) : null}

          <span className="text-xs text-[var(--muted-foreground)]">{formatTime(createdAt)}</span>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </>
  );
}
