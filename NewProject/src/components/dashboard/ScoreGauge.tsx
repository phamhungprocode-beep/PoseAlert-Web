import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";

interface Props {
  score: number;
}

function statusFor(score: number) {
  if (score >= 75) return { label: "Good Posture", color: "var(--neon-green)" };
  if (score >= 50) return { label: "Fair", color: "var(--neon-yellow)" };
  return { label: "Poor Posture", color: "var(--neon-red)" };
}

export function ScoreGauge({ score }: Props) {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const mv = useMotionValue(0);
  const dash = useTransform(mv, (v) => circumference - (v / 100) * circumference);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(mv, score, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [score, mv]);

  const status = statusFor(display);

  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center">
      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-4">
        Posture Score
      </div>
      <div className="relative w-[200px] h-[200px]">
        <svg width="200" height="200" className="-rotate-90">
          <defs>
            <linearGradient id="gauge" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r={radius} stroke="rgba(255,255,255,0.06)" strokeWidth="14" fill="none" />
          <motion.circle
            cx="100"
            cy="100"
            r={radius}
            stroke="url(#gauge)"
            strokeWidth="14"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{ strokeDashoffset: dash, filter: "drop-shadow(0 0 8px rgba(37,99,235,0.6))" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-5xl font-bold tabular-nums tracking-tight">{display}</div>
          <div className="text-xs text-muted-foreground">/ 100</div>
        </div>
      </div>
      <div
        className="mt-4 px-3 py-1 rounded-full text-xs font-medium border"
        style={{
          color: status.color,
          borderColor: `${status.color}40`,
          background: `${status.color}15`,
        }}
      >
        {status.label}
      </div>
    </div>
  );
}