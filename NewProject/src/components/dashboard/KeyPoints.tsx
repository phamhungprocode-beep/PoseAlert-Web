import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";

const STATUS = {
  good: { label: "Tốt", color: "var(--neon-green)" },
  fair: { label: "Cần điều chỉnh", color: "var(--neon-yellow)" },
  poor: { label: "Sai", color: "var(--neon-red)" },
};

export function KeyPoints() {
  const analysis = useAppStore((s) => s.analysis);
  const items = [
    { label: "Lưng", value: analysis.back, detail: `${Math.round(analysis.backAngle)}°` },
    { label: "Cổ", value: analysis.neck, detail: `${Math.round(analysis.neckAngle)}°` },
    { label: "Vai", value: analysis.shoulders, detail: `${Math.round(analysis.shoulderTilt)}°` },
    { label: "Khoảng cách màn hình", value: analysis.distance, detail: `~${analysis.distanceCm} cm` },
  ] as const;

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Phân tích chi tiết</h3>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Realtime</span>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => {
          const s = STATUS[item.value];
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition"
            >
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full" style={{ background: s.color, boxShadow: `0 0 10px ${s.color}` }} />
                <span className="text-sm">{item.label}</span>
                <span className="text-[11px] text-muted-foreground">{item.detail}</span>
              </div>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-md border"
                style={{ color: s.color, borderColor: `${s.color}40`, background: `${s.color}12` }}
              >
                {s.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
