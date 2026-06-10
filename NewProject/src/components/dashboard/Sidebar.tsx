import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Activity,
  History,
  BarChart3,
  Cpu,
  User,
  Settings,
  Camera,
  Sparkles,
  Timer,
  Smartphone,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const items = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/" },
  { label: "Live Monitor", icon: Activity, to: "/monitor" },
  { label: "Phone Cam", icon: Smartphone, to: "/viewer" },
  { label: "Pomodoro", icon: Timer, to: "/pomodoro" },
  { label: "Lịch sử", icon: History, to: "/history" },
  { label: "Thống kê", icon: BarChart3, to: "/statistics" },
  { label: "Mô hình AI", icon: Cpu, to: "/ai-model" },
  { label: "Hồ sơ", icon: User, to: "/profile" },
  { label: "Cài đặt", icon: Settings, to: "/settings" },
] as const;

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col glass-card border-r border-[var(--color-sidebar-border)] bg-[var(--color-sidebar)]/80">
      <div className="px-6 py-6 flex items-center gap-3 border-b border-white/5">
        <div className="relative w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight">PoseAlertAI</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Smart Posture</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                active ? "text-white" : "text-muted-foreground hover:text-white hover:bg-white/5",
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background: "linear-gradient(90deg, rgba(37,99,235,0.18), rgba(37,99,235,0.04))",
                    boxShadow: "inset 0 0 0 1px rgba(37,99,235,0.4), 0 0 20px -8px rgba(37,99,235,0.6)",
                  }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={cn("relative w-4 h-4", active && "text-[var(--neon-cyan)]")} />
              <span className="relative font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 pb-6 space-y-3">
        <div className="glass-card rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Trạng thái</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--neon-green)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--neon-green)]"></span>
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 text-foreground/90">
              <Cpu className="w-3.5 h-3.5 text-[var(--neon-cyan)]" />
              AI Model sẵn sàng
            </div>
            <div className="flex items-center gap-2 text-foreground/90">
              <Camera className="w-3.5 h-3.5 text-[var(--neon-green)]" />
              Webcam kết nối
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
