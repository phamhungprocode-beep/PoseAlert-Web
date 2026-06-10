import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ChevronRight, BellOff } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

const TYPE_LABEL: Record<string, string> = {
  back: "Gù lưng",
  neck: "Cúi cổ thấp",
  shoulders: "Lệch vai",
  distance: "Quá gần màn hình",
  longSit: "Ngồi sai lâu",
};

function relTime(at: number) {
  const sec = Math.floor((Date.now() - at) / 1000);
  if (sec < 60) return `${sec}s trước`;
  if (sec < 3600) return `${Math.floor(sec / 60)} phút trước`;
  return `${Math.floor(sec / 3600)} giờ trước`;
}

export function AlertsPanel() {
  const alerts = useAppStore((s) => s.alerts);
  const clear = useAppStore((s) => s.clearAlerts);

  return (
    <div className="glass-card rounded-2xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Cảnh báo gần đây</h3>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {alerts.length} sự kiện
        </span>
      </div>
      <div className="space-y-2 flex-1 overflow-y-auto max-h-[360px] pr-1">
        <AnimatePresence initial={false}>
          {alerts.length === 0 && (
            <div className="flex flex-col items-center justify-center text-muted-foreground text-sm py-12">
              <BellOff className="w-6 h-6 mb-2" />
              Chưa có cảnh báo nào
            </div>
          )}
          {alerts.map((a) => (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[var(--neon-red)]/30 hover:bg-[var(--neon-red)]/5 transition cursor-pointer"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background:
                    a.severity === "voice"
                      ? "rgba(124,58,237,0.15)"
                      : a.severity === "danger"
                      ? "rgba(239,68,68,0.15)"
                      : "rgba(245,158,11,0.15)",
                  color:
                    a.severity === "voice" ? "#a78bfa" : a.severity === "danger" ? "#ef4444" : "#f59e0b",
                }}
              >
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{TYPE_LABEL[a.type] ?? a.type}</div>
                <div className="text-[11px] text-muted-foreground truncate">{a.message}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{relTime(a.at)}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {alerts.length > 0 && (
        <button
          onClick={clear}
          className="mt-4 w-full text-xs font-medium py-2 rounded-lg border border-white/10 hover:bg-white/5 transition"
        >
          Xoá toàn bộ
        </button>
      )}
    </div>
  );
}
