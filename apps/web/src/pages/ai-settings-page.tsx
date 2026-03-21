import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageSpinner } from "@/components/ui/spinner";

import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { Navigate } from "react-router-dom";
import type { AiDataSetting, AiChatConfig } from "@app/shared";

const CATEGORY_LABELS: Record<string, string> = {
  market: "Thị trường", competitor: "Đối thủ cạnh tranh", target_customer: "Khách hàng mục tiêu",
  journey: "Hành trình khách hàng", attraction: "Điểm du lịch", dining: "Ẩm thực",
  transportation: "Phương tiện di chuyển", inventory_strategy: "Chiến lược ôm quỹ phòng",
  property: "Cơ sở lưu trú", pricing: "Bảng giá phòng", itinerary: "Lịch trình mẫu",
  evaluation: "Đánh giá cơ sở lưu trú",
};

const CREATIVITY_OPTIONS = [
  { value: "strict", label: "Chỉ dữ liệu" },
  { value: "enhanced", label: "DB + Gợi ý" },
  { value: "creative", label: "Sáng tạo" },
] as const;

const TABS = [
  { id: "data", label: "Dữ liệu AI" },
  { id: "model", label: "Cấu hình Model" },
  { id: "prompts", label: "Prompt hệ thống" },
  { id: "skills", label: "Agent Skills" },
] as const;

export default function AiSettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("data");
  if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Cài đặt AI</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Kiểm soát dữ liệu, model, prompt và agent skills cho AI chatbot.
        </p>
      </div>
      <div className="flex gap-1 border-b border-[var(--border)]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-teal-600 text-teal-600"
                : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === "data" && <DataSettingsTab />}
      {activeTab === "model" && <ConfigsByCategory category="model" title="Model AI" desc="Cấu hình model Gemini chính và phụ" extraTitle="Hành vi" extraCategory="behavior" extraDesc="Cache, lịch sử chat" />}
      {activeTab === "prompts" && <PromptConfigTab category="prompt" />}
      {activeTab === "skills" && <PromptConfigTab category="skill" />}
    </div>
  );
}

// ─── Shared hooks ───────────────────────────────────────────────────────────

function useConfigs() {
  return useQuery({
    queryKey: ["ai-chat-configs"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: AiChatConfig[] }>("/ai-chat-configs");
      return res.data.data ?? [];
    },
  });
}

function useSaveMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ configKey, configValue }: { configKey: string; configValue: string }) => {
      await apiClient.patch(`/ai-chat-configs/${configKey}`, { configValue });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-chat-configs"] }),
  });
}

function useResetMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (configKey: string) => {
      await apiClient.post(`/ai-chat-configs/reset/${configKey}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-chat-configs"] }),
  });
}

// ─── Tab 1: Data Settings ───────────────────────────────────────────────────

function DataSettingsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["ai-data-settings"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: AiDataSetting[] }>("/ai-data-settings");
      return res.data.data ?? [];
    },
  });
  const mutation = useMutation({
    mutationFn: async ({ category, ...body }: { category: string; isEnabled?: boolean; creativityLevel?: string }) => {
      await apiClient.patch(`/ai-data-settings/${category}`, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-data-settings"] }),
  });
  if (isLoading) return <PageSpinner />;

  return (
    <>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
        {(data ?? []).map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[var(--foreground)]">{CATEGORY_LABELS[s.dataCategory] ?? s.dataCategory}</p>
              {s.description && <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{s.description}</p>}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <select
                value={s.creativityLevel}
                onChange={(e) => mutation.mutate({ category: s.dataCategory, creativityLevel: e.target.value })}
                disabled={mutation.isPending}
                className="text-xs rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1"
              >
                {CREATIVITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                type="button" role="switch" aria-checked={s.isEnabled} disabled={mutation.isPending}
                onClick={() => mutation.mutate({ category: s.dataCategory, isEnabled: !s.isEnabled })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors disabled:opacity-50 ${s.isEnabled ? "bg-teal-600" : "bg-[var(--muted)]"}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${s.isEnabled ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {/* Pricing options manager moved to /pricing page */}
    </>
  );
}

// ─── Tab 2: Model & Behavior Configs ────────────────────────────────────────

function ConfigsByCategory({ category, title, desc, extraCategory, extraTitle, extraDesc }: {
  category: string; title: string; desc: string;
  extraCategory?: string; extraTitle?: string; extraDesc?: string;
}) {
  const { data, isLoading } = useConfigs();
  const saveMut = useSaveMutation();
  const resetMut = useResetMutation();
  if (isLoading) return <PageSpinner />;

  const main = (data ?? []).filter((c) => c.category === category);
  const extra = extraCategory ? (data ?? []).filter((c) => c.category === extraCategory) : [];

  return (
    <div className="space-y-6">
      <ConfigSection title={title} desc={desc} configs={main} saveMut={saveMut} resetMut={resetMut} />
      {extra.length > 0 && <ConfigSection title={extraTitle!} desc={extraDesc!} configs={extra} saveMut={saveMut} resetMut={resetMut} />}
    </div>
  );
}

function ConfigSection({ title, desc, configs, saveMut, resetMut }: {
  title: string; desc: string; configs: AiChatConfig[];
  saveMut: ReturnType<typeof useSaveMutation>; resetMut: ReturnType<typeof useResetMutation>;
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="text-sm text-[var(--muted-foreground)] mb-3">{desc}</p>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
        {configs.map((c) => <ConfigRow key={c.id} config={c} saveMut={saveMut} resetMut={resetMut} />)}
      </div>
    </div>
  );
}

function ConfigRow({ config, saveMut, resetMut }: {
  config: AiChatConfig;
  saveMut: ReturnType<typeof useSaveMutation>; resetMut: ReturnType<typeof useResetMutation>;
}) {
  const [value, setValue] = useState(config.configValue);
  const changed = value !== config.configValue;

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--foreground)]">{config.label}</p>
          {config.description && <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{config.description}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input
            type={config.configType === "number" ? "number" : "text"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-48 text-sm rounded border border-[var(--border)] bg-[var(--background)] px-3 py-1.5"
          />
          {changed && (
            <button onClick={() => saveMut.mutate({ configKey: config.configKey, configValue: value })}
              disabled={saveMut.isPending}
              className="text-xs px-3 py-1.5 rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">Lưu</button>
          )}
          <button onClick={() => { resetMut.mutate(config.configKey); }}
            disabled={resetMut.isPending}
            title="Reset về mặc định"
            className="text-xs px-2 py-1.5 rounded border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] disabled:opacity-50">
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 3: Prompt editors ──────────────────────────────────────────────────

function PromptConfigTab({ category }: { category: string }) {
  const { data, isLoading } = useConfigs();
  const saveMut = useSaveMutation();
  const resetMut = useResetMutation();
  if (isLoading) return <PageSpinner />;

  const configs = (data ?? []).filter((c) => c.category === category);

  // For skills tab: group prompt + model + temp per agent
  if (category === "skill") {
    return <SkillsTab configs={configs} saveMut={saveMut} resetMut={resetMut} />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted-foreground)]">Chỉnh sửa từng phần prompt hệ thống. Reset = khôi phục mặc định.</p>
      {configs.map((c) => <PromptEditor key={c.id} config={c} saveMut={saveMut} resetMut={resetMut} />)}
    </div>
  );
}

function PromptEditor({ config, saveMut, resetMut }: {
  config: AiChatConfig;
  saveMut: ReturnType<typeof useSaveMutation>; resetMut: ReturnType<typeof useResetMutation>;
}) {
  const [value, setValue] = useState(config.configValue);
  const changed = value !== config.configValue;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-medium text-[var(--foreground)]">{config.label}</p>
          {config.description && <p className="text-xs text-[var(--muted-foreground)]">{config.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {changed && (
            <button onClick={() => saveMut.mutate({ configKey: config.configKey, configValue: value })}
              disabled={saveMut.isPending}
              className="text-xs px-3 py-1.5 rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">Lưu</button>
          )}
          <button onClick={() => resetMut.mutate(config.configKey)}
            disabled={resetMut.isPending} title="Reset về mặc định"
            className="text-xs px-2 py-1.5 rounded border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] disabled:opacity-50">
            Reset
          </button>
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={6}
        className="w-full text-sm rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 resize-y font-mono"
      />
    </div>
  );
}

// ─── Tab 4: Skills — grouped prompt + model + temp per agent ────────────────

/** Skill keys that have a prompt textarea (not _model or _temp suffixed) */
const SKILL_PROMPT_KEYS = ["skill_overview", "skill_pricing", "skill_comparison", "skill_attractions", "skill_itinerary", "skill_business", "skill_kb"];

function SkillsTab({ configs, saveMut, resetMut }: {
  configs: AiChatConfig[];
  saveMut: ReturnType<typeof useSaveMutation>; resetMut: ReturnType<typeof useResetMutation>;
}) {
  const byKey = new Map(configs.map((c) => [c.configKey, c]));

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted-foreground)]">
        Mỗi agent có prompt riêng + cấu hình LLM riêng. Trống = dùng mặc định (cheap model chung).
      </p>
      {SKILL_PROMPT_KEYS.map((key) => {
        const promptCfg = byKey.get(key);
        const modelCfg = byKey.get(`${key}_model`);
        const tempCfg = byKey.get(`${key}_temp`);
        if (!promptCfg) return null;
        return (
          <SkillCard key={key} prompt={promptCfg} model={modelCfg} temp={tempCfg} saveMut={saveMut} resetMut={resetMut} />
        );
      })}
    </div>
  );
}

function SkillCard({ prompt, model, temp, saveMut, resetMut }: {
  prompt: AiChatConfig; model?: AiChatConfig; temp?: AiChatConfig;
  saveMut: ReturnType<typeof useSaveMutation>; resetMut: ReturnType<typeof useResetMutation>;
}) {
  const [promptVal, setPromptVal] = useState(prompt.configValue);
  const [modelVal, setModelVal] = useState(model?.configValue ?? "");
  const [tempVal, setTempVal] = useState(temp?.configValue ?? "");

  const promptChanged = promptVal !== prompt.configValue;
  const modelChanged = model && modelVal !== model.configValue;
  const tempChanged = temp && tempVal !== temp.configValue;
  const anyChanged = promptChanged || modelChanged || tempChanged;

  const saveAll = () => {
    if (promptChanged) saveMut.mutate({ configKey: prompt.configKey, configValue: promptVal });
    if (modelChanged && model) saveMut.mutate({ configKey: model.configKey, configValue: modelVal });
    if (tempChanged && temp) saveMut.mutate({ configKey: temp.configKey, configValue: tempVal });
  };

  const resetAll = () => {
    resetMut.mutate(prompt.configKey);
    if (model) resetMut.mutate(model.configKey);
    if (temp) resetMut.mutate(temp.configKey);
  };

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-medium text-[var(--foreground)]">{prompt.label}</p>
          {prompt.description && <p className="text-xs text-[var(--muted-foreground)]">{prompt.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {anyChanged && (
            <button onClick={saveAll} disabled={saveMut.isPending}
              className="text-xs px-3 py-1.5 rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">Lưu tất cả</button>
          )}
          <button onClick={resetAll} disabled={resetMut.isPending} title="Reset tất cả về mặc định"
            className="text-xs px-2 py-1.5 rounded border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] disabled:opacity-50">
            Reset
          </button>
        </div>
      </div>

      {/* LLM config row */}
      <div className="flex gap-3 mb-3">
        <div className="flex-1">
          <label className="text-xs text-[var(--muted-foreground)] mb-1 block">Model (trống = mặc định)</label>
          <input
            type="text" value={modelVal} onChange={(e) => setModelVal(e.target.value)}
            placeholder="gemini-2.5-flash-lite"
            className="w-full text-sm rounded border border-[var(--border)] bg-[var(--background)] px-3 py-1.5"
          />
        </div>
        <div className="w-32">
          <label className="text-xs text-[var(--muted-foreground)] mb-1 block">Temperature</label>
          <input
            type="number" step="0.1" min="0" max="2" value={tempVal} onChange={(e) => setTempVal(e.target.value)}
            placeholder="auto"
            className="w-full text-sm rounded border border-[var(--border)] bg-[var(--background)] px-3 py-1.5"
          />
        </div>
      </div>

      {/* Prompt textarea */}
      <textarea
        value={promptVal} onChange={(e) => setPromptVal(e.target.value)}
        rows={5}
        className="w-full text-sm rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 resize-y font-mono"
      />
    </div>
  );
}
