import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { WebcamMonitor } from "@/components/dashboard/WebcamMonitor";
import { ScoreGaugeLive } from "@/components/dashboard/ScoreGaugeLive";
import { KeyPoints } from "@/components/dashboard/KeyPoints";
import { StatCards } from "@/components/dashboard/StatCards";
import { HistoryChart } from "@/components/dashboard/HistoryChart";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { useAppStore } from "@/store/useAppStore";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PoseAlertAI — Dashboard giám sát tư thế" },
      { name: "description", content: "Dashboard giám sát tư thế bằng AI thời gian thực." },
      { property: "og:title", content: "PoseAlertAI Dashboard" },
      { property: "og:description", content: "AI Posture Monitoring System." },
    ],
  }),
  component: Index,
});

function Index() {
  const score = useAppStore((s) => s.analysis.score);
  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <WebcamMonitor />
          </div>
          <div className="flex flex-col gap-6">
            <ScoreGaugeLive />
            <KeyPoints />
          </div>
        </div>

        <StatCards />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <HistoryChart liveScore={score} />
          </div>
          <AlertsPanel />
        </div>
      </div>
    </DashboardShell>
  );
}
