import { motion, useMotionValue, animate } from "framer-motion";
import { Clock, AlertTriangle, CheckCircle2, BarChart3, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useLiveQuery } from "@/hooks/useLiveQuery";
import { getDB } from "@/database/db";

interface Stat {
  label: string;
  value: number;
  suffix?: string;
  progress: number;
  color: string;
  icon: LucideIcon;
  gradient: string;
}

function AnimatedNumber({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const [n, setN] = useState(0);
  useEffect(() => {
    const c = animate(mv, value, { duration: 1, ease: "easeOut", onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [value, mv]);
  return <>{n}</>;
}

export function StatCards() {
  const session = useAppStore((s) => s.session);
  const analysis = useAppStore((s) => s.analysis);

  // Today's sessions
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const todaySessions = useLiveQuery(
    async () => (await getDB().sessions.where("startedAt").above(startOfDay.getTime()).toArray()),
    [],
    [],
  );

  const totalMinutesToday =
    Math.round(((session.active && session.startedAt ? Date.now() - session.startedAt : 0) +
      todaySessions.reduce((s, x) => s + x.durationMs, 0)) / 60000);
  const totalSessions = todaySessions.length + (session.active ? 1 : 0);
  const goodRatio =
    session.totalFrames > 0
      ? Math.round((session.goodFrames / session.totalFrames) * 100)
      : Math.round((todaySessions.reduce((s, x) => s + x.goodPostureRatio, 0) / Math.max(1, todaySessions.length)) * 100) || 0;
  const alertsToday = session.alertsCount + todaySessions.reduce((s, x) => s + x.alertsCount, 0);

  const stats: Stat[] = [
    { label: "Thời gian học hôm nay", value: totalMinutesToday, suffix: "p", progress: Math.min(100, totalMinutesToday * 2), color: "var(--neon-cyan)", icon: Clock, gradient: "linear-gradient(90deg,#06b6d4,#2563eb)" },
    { label: "Số cảnh báo", value: alertsToday, progress: Math.min(100, alertsToday * 8), color: "var(--neon-red)", icon: AlertTriangle, gradient: "linear-gradient(90deg,#ef4444,#f59e0b)" },
    { label: "Tỷ lệ tư thế đúng", value: Math.max(0, Math.min(100, goodRatio || analysis.score)), suffix: "%", progress: Math.max(0, Math.min(100, goodRatio || analysis.score)), color: "var(--neon-green)", icon: CheckCircle2, gradient: "linear-gradient(90deg,#22c55e,#06b6d4)" },
    { label: "Tổng số phiên", value: totalSessions, progress: Math.min(100, totalSessions * 10), color: "var(--neon-blue)", icon: BarChart3, gradient: "linear-gradient(90deg,#2563eb,#7c3aed)" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s, i) => {
        const Icon = s.icon;
        return (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ y: -2 }}
            className="glass-card rounded-2xl p-5 relative overflow-hidden group"
          >
            <div className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition pointer-events-none"
              style={{ background: `linear-gradient(135deg, ${s.color}30, transparent 60%)` }} />
            <div className="flex items-center justify-between mb-4 relative">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${s.color}18`, color: s.color }}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-semibold tabular-nums tracking-tight relative">
              <AnimatedNumber value={s.value} />
              {s.suffix && <span className="text-base text-muted-foreground ml-1">{s.suffix}</span>}
            </div>
            <div className="mt-4 h-1.5 rounded-full bg-white/5 overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${s.progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: s.gradient, boxShadow: `0 0 14px -2px ${s.color}` }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
