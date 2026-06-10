import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useEffect, useState } from "react";

interface Point {
  t: string;
  score: number;
}

const seed: Point[] = Array.from({ length: 24 }).map((_, i) => ({
  t: `${i}:00`,
  score: Math.round(55 + Math.sin(i / 3) * 20 + Math.random() * 10),
}));

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: dot, boxShadow: `0 0 8px ${dot}` }}
      />
      {label}
    </div>
  );
}

export function HistoryChart({ liveScore }: { liveScore: number }) {
  const [data, setData] = useState<Point[]>(seed);

  useEffect(() => {
    if (!liveScore) return;
    const id = window.setInterval(() => {
      setData((d) => [
        ...d.slice(1),
        {
          t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          score: liveScore,
        },
      ]);
    }, 2500);
    return () => clearInterval(id);
  }, [liveScore]);

  return (
    <div className="glass-card rounded-2xl p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">Posture History</h3>
          <p className="text-xs text-muted-foreground">Score trend over the current session</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <Legend dot="#22c55e" label="Good" />
          <Legend dot="#f59e0b" label="Fair" />
          <Legend dot="#ef4444" label="Poor" />
        </div>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="scoreStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="50%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="t" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
            <Tooltip
              contentStyle={{
                background: "rgba(17,24,39,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                fontSize: 12,
              }}
              labelStyle={{ color: "rgba(255,255,255,0.6)" }}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="url(#scoreStroke)"
              strokeWidth={2.5}
              fill="url(#scoreFill)"
              isAnimationActive
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}