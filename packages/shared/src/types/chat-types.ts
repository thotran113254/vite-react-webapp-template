export type ChatRole = "user" | "assistant" | "system";

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  isPinned: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type CreateChatSessionDto = {
  title?: string;
};

export type SendMessageDto = {
  content: string;
};
