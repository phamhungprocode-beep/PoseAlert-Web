import { DashboardShell } from "./DashboardShell";
import { Sparkles } from "lucide-react";

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <DashboardShell>
      <div className="glass-card rounded-2xl p-10 lg:p-16 flex flex-col items-center text-center min-h-[60vh] justify-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
        >
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">{description}</p>
        <div className="mt-6 px-3 py-1 rounded-full text-[11px] uppercase tracking-[0.18em] border border-white/10 text-muted-foreground">
          Coming soon
        </div>
      </div>
    </DashboardShell>
  );
}