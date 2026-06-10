/**
 * Geometric posture analysis.
 * Computes:
 *   - neckAngle  : angle of (earMid -> shoulderMid) vs vertical (degrees)
 *   - shoulderTilt: angle of shoulder line vs horizontal (degrees)
 *   - backAngle  : angle of (shoulderMid -> hipMid) vs vertical (degrees)
 *   - distanceCm : screen distance estimated from inter-eye width
 *   - confidence : avg keypoint score
 *
 * MediaPipe Pose Landmark indices used:
 *   0  nose
 *   2  left eye, 5 right eye
 *   7  left ear,  8 right ear
 *   11 left shoulder, 12 right shoulder
 *   23 left hip, 24 right hip
 */

export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface RawMetrics {
  neckAngle: number;
  shoulderTilt: number;
  backAngle: number;
  distanceCm: number;
  faceWidth: number; // raw inter-eye distance (0..1)
  confidence: number;
}

export interface PostureVerdict {
  back: "good" | "fair" | "poor";
  neck: "good" | "fair" | "poor";
  shoulders: "good" | "fair" | "poor";
  distance: "good" | "fair" | "poor";
  score: number;
}

const DEG = 180 / Math.PI;

function angleFromVertical(dx: number, dy: number): number {
  // angle between vector and downward vertical axis (positive Y)
  return Math.abs(Math.atan2(dx, dy) * DEG);
}

function angleFromHorizontal(dx: number, dy: number): number {
  return Math.abs(Math.atan2(dy, dx) * DEG);
}

export function extractMetrics(lm: Landmark[]): RawMetrics | null {
  if (!lm || lm.length < 25) return null;
  const lShoulder = lm[11];
  const rShoulder = lm[12];
  const lHip = lm[23];
  const rHip = lm[24];
  const lEar = lm[7];
  const rEar = lm[8];
  const lEye = lm[2];
  const rEye = lm[5];

  const keys = [lShoulder, rShoulder, lHip, rHip, lEar, rEar, lEye, rEye];
  const confidence =
    keys.reduce((s, k) => s + (k?.visibility ?? 1), 0) / keys.length;

  // Midpoints
  const sx = (lShoulder.x + rShoulder.x) / 2;
  const sy = (lShoulder.y + rShoulder.y) / 2;
  const hx = (lHip.x + rHip.x) / 2;
  const hy = (lHip.y + rHip.y) / 2;
  const ex = (lEar.x + rEar.x) / 2;
  const ey = (lEar.y + rEar.y) / 2;

  // Neck: ear midpoint -> shoulder midpoint vs vertical
  const neckAngle = angleFromVertical(ex - sx, sy - ey);

  // Back: shoulder midpoint -> hip midpoint vs vertical
  const backAngle = angleFromVertical(sx - hx, hy - sy);

  // Shoulder tilt: vector from left shoulder to right shoulder vs horizontal
  const shoulderTilt = angleFromHorizontal(rShoulder.x - lShoulder.x, rShoulder.y - lShoulder.y);

  // Distance via eye spread
  const faceWidth = Math.hypot(rEye.x - lEye.x, rEye.y - lEye.y);
  // Empirical: faceWidth 0.05 ≈ far (~80cm); 0.12 ≈ near (~30cm).
  // Linear-ish mapping clamped.
  const distanceCm = Math.max(15, Math.min(120, Math.round(80 - (faceWidth - 0.05) * 700)));

  return {
    neckAngle,
    shoulderTilt,
    backAngle,
    distanceCm,
    faceWidth,
    confidence,
  };
}

export interface Thresholds {
  neckGood: number;
  neckFair: number;
  backGood: number;
  backFair: number;
  shoulderGood: number;
  shoulderFair: number;
  distanceGood: number;   // >= cm
  distanceFair: number;   // >= cm
  distanceClose: number;  // < cm = poor (too close)
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  neckGood: 15,
  neckFair: 25,
  backGood: 10,
  backFair: 20,
  shoulderGood: 10,
  shoulderFair: 20,
  distanceGood: 50,
  distanceFair: 40,
  distanceClose: 30,
};

export function classify(metrics: RawMetrics, baseline: RawMetrics | null, th: Thresholds = DEFAULT_THRESHOLDS): PostureVerdict {
  // Subtract baseline if calibrated, so values become deltas
  const neck = baseline ? Math.abs(metrics.neckAngle - baseline.neckAngle) : metrics.neckAngle;
  const back = baseline ? Math.abs(metrics.backAngle - baseline.backAngle) : metrics.backAngle;
  const shoulders = baseline ? Math.abs(metrics.shoulderTilt - baseline.shoulderTilt) : metrics.shoulderTilt;
  const d = metrics.distanceCm;

  const level = (val: number, g: number, f: number): "good" | "fair" | "poor" =>
    val <= g ? "good" : val <= f ? "fair" : "poor";

  const back_v = level(back, th.backGood, th.backFair);
  const neck_v = level(neck, th.neckGood, th.neckFair);
  const shoulders_v = level(shoulders, th.shoulderGood, th.shoulderFair);
  const distance_v: "good" | "fair" | "poor" =
    d < th.distanceClose ? "poor" : d < th.distanceFair ? "poor" : d < th.distanceGood ? "fair" : "good";

  const weight = (v: "good" | "fair" | "poor") => (v === "good" ? 25 : v === "fair" ? 15 : 5);
  const score = weight(back_v) + weight(neck_v) + weight(shoulders_v) + weight(distance_v);

  return { back: back_v, neck: neck_v, shoulders: shoulders_v, distance: distance_v, score };
}
