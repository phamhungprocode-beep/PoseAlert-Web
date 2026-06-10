import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { getDB } from "@/database/db";
import { speak } from "@/services/voiceAlerts";
import toast from "react-hot-toast";

export const Route = createFileRoute("/pomodoro")({
  head: () => ({ meta: [{ title: "Pomodoro · PoseAlertAI" }] }),
  component: PomodoroPage,
});

type Mode = "basic" | "extended" | "custom";

const PRESETS: Record<Mode, { focus: number; break: number; label: string }> = {
  basic: { focus: 25, break: 5, label: "Cơ bản (25/5)" },
  extended: { focus: 50, break: 10, label: "Nâng cao (50/10)" },
  custom: { focus: 30, break: 8, label: "Tùy chỉnh" },
};

function PomodoroPage() {
  const [mode, setMode] = useState<Mode>("basic");
  const [focusMin, setFocusMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [phase, setPhase] = useState<"focus" | "break" | "idle">("idle");
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const setPomodoro = useAppStore((s) => s.setPomodoro);

  useEffect(() => {
    if (mode !== "custom") {
      setFocusMin(PRESETS[mode].focus);
      setBreakMin(PRESETS[mode].break);
      if (phase === "idle") setSecondsLeft(PRESETS[mode].focus * 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const tick = () => {
    setSecondsLeft((s) => {
      if (s <= 1) {
        if (phase === "focus") {
          speak("Đã đến giờ nghỉ ngơi.");
          toast.success("Hết phiên học — nghỉ ngơi nào!");
          getDB().pomodoros.add({ mode, focusMinutes: focusMin, breakMinutes: breakMin, completedAt: Date.now() });
          setPhase("break");
          setPomodoro(true, "break");
          return breakMin * 60;
        } else {
          speak("Hãy quay lại học tập nào.");
          toast("Bắt đầu phiên học mới", { icon: "📚" });
          setPhase("focus");
          setPomodoro(true, "focus");
          return focusMin * 60;
        }
      }
      return s - 1;
    });
  };

  const start = () => {
    if (running) return;
    setRunning(true);
    if (phase === "idle") setPhase("focus");
    setPomodoro(true, phase === "idle" ? "focus" : phase);
    intervalRef.current = window.setInterval(tick, 1000) as unknown as number;
  };
  const pause = () => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };
  const reset = () => {
    pause();
    setPhase("idle");
    setPomodoro(false, "idle");
    setSecondsLeft(focusMin * 60);
  };
  const skip = () => {
    if (phase === "focus") { setPhase("break"); setSecondsLeft(breakMin * 60); setPomodoro(running, "break"); }
    else if (phase === "break") { setPhase("focus"); setSecondsLeft(focusMin * 60); setPomodoro(running, "focus"); }
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const total = (phase === "break" ? breakMin : focusMin) * 60;
  const progress = 1 - secondsLeft / total;

  return (
    <DashboardShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Pomodoro Timer</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Đồng bộ với AI — tạm dừng giám sát khi nghỉ</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(PRESETS) as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`glass-card rounded-xl p-4 text-left transition ${mode === m ? "border-[var(--neon-cyan)]/50 shadow-[var(--shadow-glow)]" : "hover:border-white/20"}`}
            >
              <div className="text-sm font-medium">{PRESETS[m].label}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{PRESETS[m].focus}p / {PRESETS[m].break}p</div>
            </button>
          ))}
        </div>

        {mode === "custom" && (
          <div className="glass-card rounded-xl p-4 grid grid-cols-2 gap-4">
            <label className="text-sm">
              <span className="text-muted-foreground text-xs">Phút học</span>
              <input type="number" min={1} max={120} value={focusMin}
                onChange={(e) => { setFocusMin(+e.target.value); if (phase === "idle") setSecondsLeft(+e.target.value * 60); }}
                className="w-full mt-1 bg-white/5 rounded-lg px-3 py-2 outline-none" />
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground text-xs">Phút nghỉ</span>
              <input type="number" min={1} max={60} value={breakMin}
                onChange={(e) => setBreakMin(+e.target.value)}
                className="w-full mt-1 bg-white/5 rounded-lg px-3 py-2 outline-none" />
            </label>
          </div>
        )}

        <div className="glass-card rounded-2xl p-10 flex flex-col items-center">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">
            {phase === "focus" ? "Đang tập trung" : phase === "break" ? "Đang nghỉ" : "Sẵn sàng"}
          </div>
          <div className="relative w-64 h-64">
            <svg width="256" height="256" className="-rotate-90">
              <circle cx="128" cy="128" r="112" stroke="rgba(255,255,255,0.06)" strokeWidth="12" fill="none" />
              <circle cx="128" cy="128" r="112"
                stroke={phase === "break" ? "#22c55e" : "#2563eb"}
                strokeWidth="12" fill="none" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 112}
                strokeDashoffset={2 * Math.PI * 112 * (1 - progress)}
                style={{ transition: "stroke-dashoffset 1s linear", filter: "drop-shadow(0 0 10px rgba(37,99,235,0.5))" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-6xl font-bold tabular-nums tracking-tight">
              {mm}:{ss}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-8">
            {!running ? (
              <button onClick={start} className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
                <Play className="w-4 h-4" /> Bắt đầu
              </button>
            ) : (
              <button onClick={pause} className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium border border-white/10 hover:bg-white/5">
                <Pause className="w-4 h-4" /> Tạm dừng
              </button>
            )}
            <button onClick={skip} className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5">
              <SkipForward className="w-4 h-4" />
            </button>
            <button onClick={reset} className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
