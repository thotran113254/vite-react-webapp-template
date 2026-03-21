import { writeFile, mkdir } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const UPLOAD_DIR = join(process.cwd(), "uploads", "chat-images");

/** Ensure upload directory exists */
async function ensureDir() {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

/**
 * Save a base64 data URL to disk as a JPEG file.
 * Returns the URL path for serving (e.g., /uploads/chat-images/abc.jpg).
 */
export async function saveImageToDisk(dataUrl: string): Promise<string | null> {
  const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/s);
  if (!match) return null;

  const ext = match[1] === "jpeg" || match[1] === "jpg" ? "jpg" : match[1]!;
  const base64Data = match[2]!;
  const filename = `${randomUUID()}.${ext}`;

  await ensureDir();
  await writeFile(join(UPLOAD_DIR, filename), Buffer.from(base64Data, "base64"));

  return `/uploads/chat-images/${filename}`;
}

/**
 * Save multiple base64 images to disk. Returns URL paths.
 * Skips invalid images silently.
 */
export async function saveImagesToDisk(dataUrls: string[]): Promise<string[]> {
  const results = await Promise.all(dataUrls.map(saveImageToDisk));
  return results.filter((url): url is string => url !== null);
}

/**
 * Read an image file from disk and return as base64 data URL for Gemini API.
 * Input: URL path like /uploads/chat-images/abc.jpg
 */
export async function readImageAsBase64(urlPath: string): Promise<string | null> {
  try {
    // Strip leading slash, resolve relative to cwd
    const filePath = join(process.cwd(), urlPath.startsWith("/") ? urlPath.slice(1) : urlPath);
    const buffer = await readFile(filePath);
    const ext = urlPath.split(".").pop()?.toLowerCase();
    const mimeType = ext === "png" ? "image/png" : "image/jpeg";
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Convert URL paths back to base64 data URLs for Gemini.
 * Used when building Gemini content from message history.
 */
export async function urlsToBase64(urls: string[]): Promise<string[]> {
  const results = await Promise.all(urls.map(readImageAsBase64));
  return results.filter((url): url is string => url !== null);
}
