import { z } from "zod";

export const createChatSessionSchema = z.object({
  title: z.string().min(1).max(255).optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1, "Message content is required").max(10000),
  /** Base64-encoded images (data:image/...;base64,...) for multimodal chat */
  images: z.array(z.string().max(5_000_000)).max(3).optional(),
});

export type CreateChatSessionInput = z.infer<typeof createChatSessionSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
