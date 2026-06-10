/**
 * 5-second baseline capture: average user's "correct" posture metrics.
 */
import type { RawMetrics } from "./PoseAnalyzer";
import type { CalibrationBaseline } from "@/database/db";
import { getDB } from "@/database/db";

export class CalibrationSession {
  private samples: RawMetrics[] = [];
  private startTime = 0;
  active = false;

  start() {
    this.samples = [];
    this.startTime = performance.now();
    this.active = true;
  }
  feed(m: RawMetrics) {
    if (!this.active) return;
    this.samples.push(m);
  }
  progress(durationMs = 5000): number {
    if (!this.active) return 0;
    return Math.min(1, (performance.now() - this.startTime) / durationMs);
  }
  finish(): CalibrationBaseline | null {
    this.active = false;
    if (this.samples.length < 10) return null;
    const avg = <K extends keyof RawMetrics>(k: K) =>
      this.samples.reduce((s, x) => s + (x[k] as number), 0) / this.samples.length;
    return {
      id: "default",
      neckAngle: avg("neckAngle"),
      backAngle: avg("backAngle"),
      shoulderTilt: avg("shoulderTilt"),
      faceWidth: avg("faceWidth"),
      capturedAt: Date.now(),
    };
  }
}

export async function saveBaseline(b: CalibrationBaseline) {
  const db = getDB();
  await db.calibration.put(b);
}

export async function loadBaseline(): Promise<CalibrationBaseline | null> {
  const db = getDB();
  return (await db.calibration.get("default")) ?? null;
}
