/**
 * EMA + sliding window for stable posture decisions.
 */
import type { RawMetrics } from "./PoseAnalyzer";

export class EMA {
  private value: number | null = null;
  constructor(private alpha = 0.25) {}
  push(v: number): number {
    this.value = this.value == null ? v : this.alpha * v + (1 - this.alpha) * this.value;
    return this.value;
  }
  get(): number { return this.value ?? 0; }
  reset() { this.value = null; }
}

export class MetricsSmoother {
  private neck = new EMA();
  private back = new EMA();
  private shoulder = new EMA();
  private distance = new EMA(0.2);
  private confidence = new EMA(0.3);

  smooth(m: RawMetrics): RawMetrics {
    return {
      neckAngle: this.neck.push(m.neckAngle),
      backAngle: this.back.push(m.backAngle),
      shoulderTilt: this.shoulder.push(m.shoulderTilt),
      distanceCm: this.distance.push(m.distanceCm),
      faceWidth: m.faceWidth,
      confidence: this.confidence.push(m.confidence),
    };
  }
}

/** Sliding window: returns true if >= threshold of last N frames are bad. */
export class BadPostureWindow {
  private buf: boolean[] = [];
  constructor(private size = 30, private threshold = 0.8) {}
  push(bad: boolean): boolean {
    this.buf.push(bad);
    if (this.buf.length > this.size) this.buf.shift();
    if (this.buf.length < this.size * 0.5) return false;
    const badCount = this.buf.filter(Boolean).length;
    return badCount / this.buf.length >= this.threshold;
  }
  reset() { this.buf = []; }
}
