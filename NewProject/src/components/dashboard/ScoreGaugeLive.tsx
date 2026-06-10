import { useAppStore } from "@/store/useAppStore";
import { ScoreGauge } from "./ScoreGauge";

export function ScoreGaugeLive() {
  const score = useAppStore((s) => s.analysis.score);
  return <ScoreGauge score={score} />;
}
