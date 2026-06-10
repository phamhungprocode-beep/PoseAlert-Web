import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { WebcamMonitor } from "@/components/dashboard/WebcamMonitor";
import { KeyPoints } from "@/components/dashboard/KeyPoints";
import { ScoreGaugeLive } from "@/components/dashboard/ScoreGaugeLive";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { useAppStore } from "@/store/useAppStore";

export const Route = createFileRoute("/monitor")({
  head: () => ({
    meta: [
      { title: "Live Monitor · PoseAlertAI" },
      { name: "description", content: "Theo dõi tư thế và các góc cơ thể theo thời gian thực." },
    ],
  }),
  component: Monitor,
});

function Monitor() {
  const a = useAppStore((s) => s.analysis);
  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <WebcamMonitor />
          </div>
          <div className="space-y-6">
            <ScoreGaugeLive />
            <KeyPoints />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { l: "Góc cổ", v: `${Math.round(a.neckAngle)}°` },
            { l: "Góc lưng", v: `${Math.round(a.backAngle)}°` },
            { l: "Lệch vai", v: `${Math.round(a.shoulderTilt)}°` },
            { l: "Khoảng cách", v: `~${a.distanceCm} cm` },
            { l: "Confidence", v: `${Math.round(a.confidence * 100)}%` },
          ].map((x) => (
            <div key={x.l} className="glass-card rounded-xl p-4">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{x.l}</div>
              <div className="text-xl font-semibold tabular-nums mt-1">{x.v}</div>
            </div>
          ))}
        </div>

        <AlertsPanel />
      </div>
    </DashboardShell>
  );
}
