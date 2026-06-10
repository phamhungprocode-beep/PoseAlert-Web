import { motion } from "framer-motion";
import { Play, Square, ShieldCheck } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { getDB } from "@/database/db";
import toast from "react-hot-toast";

export function Header() {
  const session = useAppStore((s) => s.session);
  const startSession = useAppStore((s) => s.startSession);
  const endSession = useAppStore((s) => s.endSession);
  const analysis = useAppStore((s) => s.analysis);

  const handleToggle = async () => {
    if (session.active) {
      const startedAt = session.startedAt ?? Date.now();
      const endedAt = Date.now();
      const ratio = session.totalFrames > 0 ? session.goodFrames / session.totalFrames : 0;
      const avg = session.totalFrames > 0 ? session.scoreSum / session.totalFrames : 0;
      try {
        await getDB().sessions.add({
          startedAt,
          endedAt,
          durationMs: endedAt - startedAt,
          goodPostureRatio: ratio,
          alertsCount: session.alertsCount,
          avgScore: avg,
        });
        toast.success("Đã lưu phiên học");
      } catch (e) {
        console.warn(e);
      }
      endSession();
    } else {
      startSession();
      toast("Bắt đầu phiên học mới", { icon: "▶️" });
    }
  };

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-[var(--color-background)]/70 border-b border-white/5">
      <div className="flex items-center justify-between px-6 lg:px-10 py-5">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl lg:text-2xl font-semibold tracking-tight"
          >
            Hệ thống giám sát tư thế AI
          </motion.h1>
          <p className="text-xs lg:text-sm text-muted-foreground mt-0.5">
            Phát hiện tư thế sai và cảnh báo bằng giọng nói tiếng Việt
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-[var(--neon-green)]/30 bg-[var(--neon-green)]/10 text-[var(--neon-green)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--neon-green)] opacity-70"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--neon-green)]"></span>
            </span>
            {analysis.fps} FPS · {Math.round(analysis.confidence * 100)}%
          </div>
          <button
            onClick={handleToggle}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 hover:bg-white/5 transition"
          >
            {session.active ? <Square className="w-3.5 h-3.5 text-[var(--neon-red)]" /> : <Play className="w-3.5 h-3.5 text-[var(--neon-green)]" />}
            <span className="hidden sm:inline">{session.active ? "Kết thúc phiên" : "Bắt đầu phiên"}</span>
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--neon-cyan)]" />
            <span className="hidden sm:inline">Local</span>
          </div>
        </div>
      </div>
    </header>
  );
}
