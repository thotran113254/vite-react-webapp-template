import { useState, useRef, useCallback } from "react";
import { Upload, X, ImageIcon, ZoomIn, GripVertical, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";

interface ImageManagerProps {
  images: string[];
  onChange: (images: string[]) => void;
  disabled?: boolean;
  maxImages?: number;
}

/** Resolve /uploads/ paths for display */
export function resolveImageUrl(src: string): string {
  if (!src) return "";
  if (src.startsWith("http")) return src;
  return src; // Vite proxy handles /uploads/
}

/** Compact thumbnail for use in tables/lists */
export function ImageThumbnail({ src, alt = "", size = 40 }: { src?: string | null; alt?: string; size?: number }) {
  if (!src) {
    return (
      <div className="flex items-center justify-center rounded-md bg-[var(--muted)]/30 text-[var(--muted-foreground)]"
        style={{ width: size, height: size }}>
        <ImageIcon className="h-4 w-4" />
      </div>
    );
  }
  return (
    <img src={resolveImageUrl(src)} alt={alt} loading="lazy"
      className="rounded-md object-cover bg-[var(--muted)]/20"
      style={{ width: size, height: size }}
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
  );
}

type UploadProgress = { file: string; progress: number; done: boolean; error?: string };

/** Image upload & management with drag-drop, progress, lightbox, reorder. */
export function ImageManager({ images, onChange, disabled = false, maxImages = 10 }: ImageManagerProps) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files).slice(0, maxImages - images.length);
    if (fileArr.length === 0) return;

    setError(null);
    const progresses: UploadProgress[] = fileArr.map((f) => ({ file: f.name, progress: 0, done: false }));
    setUploads(progresses);

    const results: string[] = [];
    // Upload in parallel (max 3 concurrent)
    const chunks: File[][] = [];
    for (let i = 0; i < fileArr.length; i += 3) chunks.push(fileArr.slice(i, i + 3));

    for (const chunk of chunks) {
      const promises = chunk.map(async (file, ci) => {
        const idx = chunks.indexOf(chunk) * 3 + ci;
        try {
          const formData = new FormData();
          formData.append("file", file);
          const res = await apiClient.post<{ data: { url: string } }>("/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
            onUploadProgress: (e) => {
              const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 50;
              setUploads((prev) => prev.map((p, i) => i === idx ? { ...p, progress: pct } : p));
            },
          });
          setUploads((prev) => prev.map((p, i) => i === idx ? { ...p, progress: 100, done: true } : p));
          return res.data.data.url;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Lỗi upload";
          setUploads((prev) => prev.map((p, i) => i === idx ? { ...p, error: msg, done: true } : p));
          return null;
        }
      });
      const urls = await Promise.all(promises);
      results.push(...urls.filter(Boolean) as string[]);
    }

    if (results.length > 0) onChange([...images, ...results]);
    setTimeout(() => setUploads([]), 1500);
  }, [images, maxImages, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const files = e.dataTransfer.files;
    if (files.length > 0) uploadFiles(files);
  }, [disabled, uploadFiles]);

  const handleDragReorder = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const updated = [...images];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved!);
    onChange(updated);
  };

  const removeImage = async (index: number) => {
    const url = images[index];
    if (url?.startsWith("/uploads/")) {
      const filename = url.split("/").pop();
      try { await apiClient.delete(`/upload/${filename}`); } catch { /* ignore */ }
    }
    onChange(images.filter((_, i) => i !== index));
  };

  const canUpload = !disabled && images.length < maxImages;

  return (
    <div className="space-y-2">
      {/* Drop zone + image grid */}
      <div
        className={`rounded-lg border-2 border-dashed transition-colors p-2 ${
          dragOver ? "border-teal-400 bg-teal-50/50 dark:bg-teal-900/10" : "border-[var(--border)]"
        } ${canUpload ? "cursor-pointer" : ""}`}
        onDragOver={(e) => { e.preventDefault(); if (canUpload) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => { if (canUpload && images.length === 0) inputRef.current?.click(); }}
      >
        {images.length === 0 && uploads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-[var(--muted-foreground)]">
            <Upload className="mb-2 h-8 w-8" />
            <p className="text-sm font-medium">Kéo thả ảnh vào đây</p>
            <p className="text-xs mt-1">hoặc click để chọn file</p>
            <p className="text-xs mt-2 opacity-60">JPG, PNG, WebP, GIF — tối đa 5MB/ảnh</p>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {images.map((url, i) => (
              <div
                key={`${url}-${i}`}
                className={`relative group aspect-square rounded-lg overflow-hidden bg-[var(--muted)]/20 ${
                  !disabled ? "cursor-grab active:cursor-grabbing" : ""
                } ${dragIdx === i ? "opacity-50 ring-2 ring-teal-400" : ""}`}
                draggable={!disabled}
                onDragStart={() => setDragIdx(i)}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (dragIdx !== null) handleDragReorder(dragIdx, i); setDragIdx(null); }}
                onDragEnd={() => setDragIdx(null)}
              >
                <img
                  src={resolveImageUrl(url)}
                  alt={`Ảnh ${i + 1}`}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    el.style.display = "none";
                    el.parentElement?.classList.add("bg-red-50", "dark:bg-red-900/20");
                  }}
                />
                {/* Overlay buttons */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!disabled && <GripVertical className="h-4 w-4 text-white drop-shadow" />}
                </div>
                <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={() => setLightbox(i)}
                    className="rounded-full bg-black/60 p-1 text-white hover:bg-black/80">
                    <ZoomIn className="h-3 w-3" />
                  </button>
                  {!disabled && (
                    <button type="button" onClick={() => removeImage(i)}
                      className="rounded-full bg-black/60 p-1 text-white hover:bg-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {/* Index badge */}
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {i + 1}
                </span>
              </div>
            ))}

            {/* Upload progress items */}
            {uploads.filter((u) => !u.done || u.error).map((u, i) => (
              <div key={`upload-${i}`} className="relative aspect-square rounded-lg overflow-hidden bg-[var(--muted)]/30 flex flex-col items-center justify-center">
                {u.error ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <>
                    <div className="h-1 w-3/4 rounded-full bg-[var(--muted)] overflow-hidden">
                      <div className="h-full bg-teal-500 transition-all duration-300 rounded-full" style={{ width: `${u.progress}%` }} />
                    </div>
                    <p className="text-[10px] text-[var(--muted-foreground)] mt-1">{u.progress}%</p>
                  </>
                )}
                <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5 truncate max-w-full px-1">{u.file}</p>
              </div>
            ))}

            {/* Add more button */}
            {canUpload && images.length > 0 && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center text-[var(--muted-foreground)] hover:border-teal-400 hover:text-teal-600 transition-colors"
              >
                <Upload className="h-5 w-5" />
                <span className="text-[10px] mt-1">Thêm ảnh</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      {canUpload && (
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple
          className="hidden" onChange={(e) => { if (e.target.files) uploadFiles(e.target.files); e.target.value = ""; }} />
      )}

      {/* Counter */}
      {images.length > 0 && (
        <p className="text-xs text-[var(--muted-foreground)]">{images.length}/{maxImages} ảnh{!disabled && " · Kéo để sắp xếp"}</p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Lightbox */}
      <Dialog open={lightbox !== null} onOpenChange={() => setLightbox(null)}>
        <DialogContent className="max-w-4xl p-1 bg-black/95 border-0">
          {lightbox !== null && images[lightbox] && (
            <div className="relative">
              <img src={resolveImageUrl(images[lightbox]!)} alt={`Ảnh ${lightbox + 1}`}
                className="w-full max-h-[85vh] object-contain" />
              {/* Nav arrows */}
              {lightbox > 0 && (
                <button onClick={() => setLightbox(lightbox - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white hover:bg-white/40">
                  <span className="text-xl">‹</span>
                </button>
              )}
              {lightbox < images.length - 1 && (
                <button onClick={() => setLightbox(lightbox + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white hover:bg-white/40">
                  <span className="text-xl">›</span>
                </button>
              )}
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/60 px-3 py-1 text-sm text-white">
                {lightbox + 1} / {images.length}
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
