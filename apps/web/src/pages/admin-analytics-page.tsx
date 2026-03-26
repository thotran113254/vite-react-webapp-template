import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FaqAnalyticsTab } from "@/components/admin/faq-analytics-tab";
import { StaffUsageTab } from "@/components/admin/staff-usage-tab";
import { StaffChatViewerTab } from "@/components/admin/staff-chat-viewer-tab";

type Tab = "faq" | "usage" | "chat";

const TABS: { id: Tab; label: string }[] = [
  { id: "faq", label: "Câu hỏi thường gặp" },
  { id: "usage", label: "Sử dụng nhân sự" },
  { id: "chat", label: "Chat nhân viên" },
];

/** Admin analytics dashboard — 3 tabs: FAQ, staff usage, chat viewer */
export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("faq");

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">Báo cáo & Phân tích</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Thống kê câu hỏi, sử dụng nhân sự và lịch sử chat
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-[var(--background)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5">
        {activeTab === "faq" && <FaqAnalyticsTab />}
        {activeTab === "usage" && <StaffUsageTab />}
        {activeTab === "chat" && <StaffChatViewerTab />}
      </div>
    </div>
  );
}
