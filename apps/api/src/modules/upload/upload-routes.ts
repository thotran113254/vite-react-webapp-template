import { Hono } from "hono";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { HTTPException } from "hono/http-exception";
import { randomUUID } from "crypto";
import { mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import sharp from "sharp";

const UPLOAD_DIR = join(process.cwd(), "uploads");
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_WIDTH = 1920;
const QUALITY = 80;

export const uploadRoutes = new Hono();
uploadRoutes.use("*", authMiddleware);

/** POST /upload — upload image, optimize with sharp, returns URL */
uploadRoutes.post("/", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];

  if (!file || !(file instanceof File)) {
    throw new HTTPException(400, { message: "No file provided. Send multipart form with 'file' field." });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new HTTPException(400, { message: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(", ")}` });
  }

  if (file.size > MAX_SIZE) {
    throw new HTTPException(400, { message: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 5MB` });
  }

  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }

  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.webp`;
  const filepath = join(UPLOAD_DIR, filename);
  const rawBuffer = Buffer.from(await file.arrayBuffer());

  // Optimize: resize to max width, convert to WebP, compress
  const optimized = await sharp(rawBuffer)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer();

  await sharp(optimized).toFile(filepath);

  const savedPercent = rawBuffer.length > 0
    ? Math.round((1 - optimized.length / rawBuffer.length) * 100)
    : 0;

  const url = `/uploads/${filename}`;
  return c.json({
    success: true,
    data: {
      url,
      filename,
      originalSize: rawBuffer.length,
      optimizedSize: optimized.length,
      savedPercent,
    },
  }, 201);
});

/** DELETE /upload/:filename — delete an uploaded image */
uploadRoutes.delete("/:filename", async (c) => {
  const filename = c.req.param("filename");

  if (filename.includes("..") || filename.includes("/")) {
    throw new HTTPException(400, { message: "Invalid filename" });
  }

  const filepath = join(UPLOAD_DIR, filename);
  if (!existsSync(filepath)) {
    throw new HTTPException(404, { message: "File not found" });
  }

  await unlink(filepath);
  return c.json({ success: true, message: "File deleted" });
});
