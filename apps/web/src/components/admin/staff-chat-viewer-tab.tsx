import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChatSessionViewerDialog } from "./chat-session-viewer-dialog";

interface StaffUser {
  id: string;
  name: string;
  email: string;
}

interface AdminChatSession {
  id: string;
  userId: string;
  userName: string;
  title: string;
  isPinned: boolean;
  createdAt: string;
  lastMessageAt: string | null;
  messageCount: number;
}

async function fetchUsers(): Promise<StaffUser[]> {
  const res = await apiClient.get("/admin/analytics/users");
  return res.data.data as StaffUser[];
}

async function fetchSessions(userId: string): Promise<AdminChatSession[]> {
  const res = await apiClient.get(`/admin/analytics/sessions?userId=${userId}&page=1`);
  return res.data.data as AdminChatSession[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Admin chat viewer tab — browse any staff member's chat sessions */
export function StaffChatViewerTab() {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [activeSession, setActiveSession] = useState<AdminChatSession | null>(null);

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-analytics-users"],
    queryFn: fetchUsers,
  });

  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ["admin-sessions", selectedUserId],
    queryFn: () => fetchSessions(selectedUserId),
    enabled: !!selectedUserId,
  });

  return (
    <div className="space-y-4">
      {/* User selector */}
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-sm text-[var(--muted-foreground)]">Chọn nhân viên:</span>
        <Select
          className="w-72"
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          disabled={loadingUsers}
          placeholder={loadingUsers ? "Đang tải..." : "Chọn nhân viên..."}
          options={users?.map((u) => ({ value: u.id, label: `${u.name} — ${u.email}` })) ?? []}
        />
      </div>

      {/* Session list */}
      {!selectedUserId ? (
        <div className="flex h-40 items-center justify-center text-sm text-[var(--muted-foreground)]">
          Chọn nhân viên để xem lịch sử chat.
        </div>
      ) : loadingSessions ? (
        <div className="flex h-40 items-center justify-center text-sm text-[var(--muted-foreground)]">
          Đang tải...
        </div>
      ) : !sessions?.length ? (
        <div className="flex h-40 items-center justify-center text-sm text-[var(--muted-foreground)]">
          Nhân viên này chưa có phiên chat nào.
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => setActiveSession(session)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--accent)]"
            >
              <MessageSquare className="h-4 w-4 shrink-0 text-blue-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{session.title}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{formatDate(session.createdAt)}</p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {session.messageCount} tin nhắn
              </Badge>
            </button>
          ))}
        </div>
      )}

      <ChatSessionViewerDialog
        session={activeSession}
        onClose={() => setActiveSession(null)}
      />
    </div>
  );
}
