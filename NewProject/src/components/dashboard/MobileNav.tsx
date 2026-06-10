import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Activity, BarChart3, Timer, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", icon: LayoutDashboard, label: "Home" },
  { to: "/monitor", icon: Activity, label: "Monitor" },
  { to: "/pomodoro", icon: Timer, label: "Pomodoro" },
  { to: "/statistics", icon: BarChart3, label: "Stats" },
  { to: "/settings", icon: Settings, label: "Settings" },
] as const;

export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <>
      <div className="lg:hidden sticky top-0 z-30 backdrop-blur-xl bg-[var(--color-background)]/70 border-b border-white/5 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--gradient-primary)" }}>
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="text-sm font-semibold">PoseAlertAI</div>
        </div>
      </div>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass-card border-t border-white/10">
        <div className="grid grid-cols-5">
          {items.map((it) => {
            const Icon = it.icon;
            const active = pathname === it.to;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] transition",
                  active ? "text-[var(--neon-cyan)]" : "text-muted-foreground",
                )}
              >
                <Icon className="w-4 h-4" />
                {it.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
