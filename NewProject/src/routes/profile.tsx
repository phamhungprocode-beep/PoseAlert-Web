import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getDB, type UserProfile } from "@/database/db";
import { useLiveQuery } from "@/hooks/useLiveQuery";
import { User, Trophy, Flame, Target, Clock } from "lucide-react";
import toast from "react-hot-toast";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Hồ sơ · PoseAlertAI" }] }),
  component: ProfilePage,
});

const BADGES = [
  { id: "beginner", label: "Beginner", icon: Target, color: "#06b6d4", req: "Hoàn thành phiên đầu tiên" },
  { id: "focus", label: "Focus Master", icon: Flame, color: "#f59e0b", req: "5 phiên Pomodoro" },
  { id: "posture", label: "Posture Expert", icon: Trophy, color: "#22c55e", req: "Tỷ lệ đúng > 80% trong 5 ngày" },
  { id: "king", label: "Productivity King", icon: Trophy, color: "#7c3aed", req: "Học liên tục 7 ngày" },
];

function ProfilePage() {
  const profile = useLiveQuery(async () => (await getDB().profile.get("me")) ?? null, null, []);
  const sessions = useLiveQuery(async () => await getDB().sessions.toArray(), [], []);
  const pomodoros = useLiveQuery(async () => await getDB().pomodoros.toArray(), [], []);
  const [form, setForm] = useState<UserProfile | null>(null);

  useEffect(() => { if (profile && !form) setForm(profile); }, [profile, form]);

  const totalMinutes = Math.round(sessions.reduce((a, b) => a + b.durationMs, 0) / 60000);
  const avgRatio = sessions.length ? Math.round((sessions.reduce((a, b) => a + b.goodPostureRatio, 0) / sessions.length) * 100) : 0;

  // Streak: consecutive days with at least 1 session
  const days = new Set(sessions.map((s) => new Date(s.startedAt).toDateString()));
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (days.has(d.toDateString())) streak++; else break;
  }

  const earned = new Set<string>();
  if (sessions.length >= 1) earned.add("beginner");
  if (pomodoros.length >= 5) earned.add("focus");
  if (sessions.length >= 5 && avgRatio > 80) earned.add("posture");
  if (streak >= 7) earned.add("king");

  const save = async () => {
    if (!form) return;
    await getDB().profile.put(form);
    toast.success("Đã lưu hồ sơ");
  };

  if (!form) return <DashboardShell><div className="text-muted-foreground">Đang tải…</div></DashboardShell>;

  const stats = [
    { l: "Tổng giờ học", v: `${(totalMinutes / 60).toFixed(1)}h`, icon: Clock, c: "#06b6d4" },
    { l: "Phiên Pomodoro", v: pomodoros.length, icon: Target, c: "#7c3aed" },
    { l: "Tỷ lệ đúng TB", v: `${avgRatio}%`, icon: Trophy, c: "#22c55e" },
    { l: "Streak", v: `${streak} ngày`, icon: Flame, c: "#f59e0b" },
  ];

  return (
    <DashboardShell>
      <div className="space-y-6 max-w-5xl">
        <div className="glass-card rounded-2xl p-6 flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold"
            style={{ background: "var(--gradient-primary)" }}>
            {(form.name || "U").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="text-xl font-semibold">{form.name || "Học viên"}</div>
            <div className="text-xs text-muted-foreground">{form.email || "Chưa cập nhật email"}</div>
          </div>
          <User className="w-6 h-6 text-muted-foreground" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => {
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

        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-4">Thông tin cá nhân</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {([
              ["Họ tên", "name", "text"],
              ["Email", "email", "email"],
              ["Tuổi", "age", "number"],
              ["Chiều cao (cm)", "heightCm", "number"],
              ["Cân nặng (kg)", "weightKg", "number"],
              ["Mục tiêu (phút/ngày)", "goalMinutesPerDay", "number"],
            ] as const).map(([label, key, type]) => (
              <label key={key} className="text-sm">
                <span className="text-muted-foreground text-xs">{label}</span>
                <input
                  type={type}
                  value={(form as any)[key] ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, [key]: type === "number" ? (e.target.value ? +e.target.value : undefined) : e.target.value })
                  }
                  className="w-full mt-1 bg-white/5 rounded-lg px-3 py-2 outline-none border border-white/5 focus:border-[var(--neon-cyan)]/40"
                />
              </label>
            ))}
          </div>
          <button onClick={save} className="mt-5 px-5 py-2 rounded-lg font-medium text-sm" style={{ background: "var(--gradient-primary)" }}>
            Lưu hồ sơ
          </button>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-4">Huy hiệu</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {BADGES.map((b) => {
              const Icon = b.icon;
              const has = earned.has(b.id);
              return (
                <div key={b.id} className={`rounded-xl p-4 border ${has ? "border-white/20" : "border-white/5 opacity-50"} bg-white/[0.02]`}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-2" style={{ background: `${b.color}18`, color: b.color }}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-medium">{b.label}</div>
                  <div className="text-[11px] text-muted-foreground">{b.req}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
