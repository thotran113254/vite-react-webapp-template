import { useRef, useState, useEffect, useCallback, type KeyboardEvent, type ClipboardEvent, type ChangeEvent } from "react";
import { Send, ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Max image dimension (px) — resize larger images to save bandwidth + tokens */
const MAX_IMAGE_SIZE = 1024;
/** Max images per message */
const MAX_IMAGES = 3;
/** JPEG quality for resized images */
const JPEG_QUALITY = 0.8;

interface ChatInputProps {
  onSend: (content: string, images?: string[]) => void;
  disabled?: boolean;
}

/** Resize image to fit within MAX_IMAGE_SIZE and compress as JPEG */
function resizeImage(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
        const ratio = Math.min(MAX_IMAGE_SIZE / width, MAX_IMAGE_SIZE / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file instanceof File ? file : file);
  });
}

/** Chat input bar with Enter-to-send, image paste (Ctrl+V), and upload button. */
export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const addImages = useCallback(async (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;
    const remaining = MAX_IMAGES - images.length;
    const toProcess = imageFiles.slice(0, remaining);
    const resized = await Promise.all(toProcess.map(resizeImage));
    setImages((prev) => [...prev, ...resized].slice(0, MAX_IMAGES));
    // Auto-focus input after adding images
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [images.length]);

  function handleSend() {
    const value = inputRef.current?.value.trim();
    if ((!value && images.length === 0) || disabled) return;
    onSend(value || "(Ảnh đính kèm)", images.length > 0 ? images : undefined);
    if (inputRef.current) inputRef.current.value = "";
    setImages([]);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handlePaste(e: ClipboardEvent) {
    const files = Array.from(e.clipboardData.files);
    if (files.some((f) => f.type.startsWith("image/"))) {
      e.preventDefault();
      addImages(files);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    addImages(files);
    if (fileRef.current) fileRef.current.value = "";
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      {/* Image previews */}
      {images.length > 0 && (
        <div className="flex gap-2 px-1">
          {images.map((img, i) => (
            <div key={i} className="relative">
              <img src={img} alt="" className="h-16 w-16 rounded-lg border border-[var(--border)] object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 shadow-sm">
        {/* Image upload button */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || images.length >= MAX_IMAGES}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)] disabled:pointer-events-none disabled:opacity-50"
          aria-label="Đính kèm ảnh"
        >
          <ImagePlus size={16} />
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />

        <input
          ref={inputRef}
          type="text"
          placeholder={images.length > 0 ? "Nhập câu hỏi về ảnh..." : "Hỏi AI về khách sạn... (Ctrl+V để dán ảnh)"}
          disabled={disabled}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors",
            "hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
          aria-label="Gửi tin nhắn"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
