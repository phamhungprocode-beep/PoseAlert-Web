import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useAppStore } from "@/store/useAppStore";
import { getDB } from "@/database/db";
import { Cpu, Activity, Gauge, MemoryStick, Check } from "lucide-react";
import toast from "react-hot-toast";

export const Route = createFileRoute("/ai-model")({
  head: () => ({ meta: [{ title: "Mô hình AI · PoseAlertAI" }] }),
  component: AIModelPage,
});

const MODELS = [
  { id: "lite", name: "MediaPipe Pose Lite", fpsTarget: "30-60", accuracy: "85%", size: "3 MB", desc: "Nhẹ, chạy mượt trên CPU yếu." },
  { id: "full", name: "MediaPipe Pose Full", fpsTarget: "20-40", accuracy: "92%", size: "9 MB", desc: "Cân bằng giữa tốc độ và độ chính xác." },
  { id: "heavy", name: "MediaPipe Pose Heavy", fpsTarget: "10-25", accuracy: "97%", size: "26 MB", desc: "Chính xác cao nhất, yêu cầu GPU." },
];

function AIModelPage() {
  const settings = useAppStore((s) => s.settings);
  const analysis = useAppStore((s) => s.analysis);
  const loadSettings = useAppStore((s) => s.loadSettings);

  const switchModel = async (id: string) => {
    const next = { ...settings, modelTier: id as any };
    await getDB().settings.put(next);
    loadSettings(next);
    toast.success(`Đã chuyển sang ${id}`);
  };

  const mem = (performance as any).memory;
  const memMB = mem ? Math.round(mem.usedJSHeapSize / 1024 / 1024) : 0;

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Quản lý mô hình AI</h2>
          <p className="text-xs text-muted-foreground mt-0.5">So sánh, benchmark và chuyển đổi model</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { l: "FPS hiện tại", v: analysis.fps, icon: Activity, c: "#06b6d4" },
            { l: "Confidence", v: `${Math.round(analysis.confidence * 100)}%`, icon: Gauge, c: "#22c55e" },
            { l: "RAM", v: memMB ? `${memMB} MB` : "—", icon: MemoryStick, c: "#7c3aed" },
            { l: "Model đang dùng", v: settings.modelTier, icon: Cpu, c: "#2563eb" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.l} className="glass-card rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground">{s.l}</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${s.c}18`, color: s.c }}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-semibold tabular-nums">{s.v}</div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {MODELS.map((m) => {
            const active = settings.modelTier === m.id;
            return (
              <div key={m.id} className={`glass-card rounded-2xl p-5 ${active ? "border-[var(--neon-cyan)]/50 shadow-[var(--shadow-glow)]" : ""}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold">{m.name}</div>
                  {active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--neon-cyan)]/15 text-[var(--neon-cyan)] flex items-center gap-1"><Check className="w-3 h-3" />Đang dùng</span>}
                </div>
                <p className="text-xs text-muted-foreground mb-4">{m.desc}</p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">FPS mục tiêu</span><span className="font-mono">{m.fpsTarget}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Độ chính xác</span><span className="font-mono">{m.accuracy}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Kích thước</span><span className="font-mono">{m.size}</span></div>
                </div>
                {!active && (
                  <button onClick={() => switchModel(m.id)} className="mt-4 w-full py-2 rounded-lg text-xs font-medium border border-white/10 hover:bg-white/5">
                    Chuyển sang model này
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DashboardShell>
  );
}
