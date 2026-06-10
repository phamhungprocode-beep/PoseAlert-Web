/**
 * IndexedDB schema (Dexie) for PoseAlertAI.
 * Stores user profile, sessions, alerts, pomodoro, settings & calibration baseline.
 */
import Dexie, { type Table } from "dexie";

export interface UserProfile {
  id: "me";
  name: string;
  email: string;
  avatar?: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  goalMinutesPerDay?: number;
  createdAt: number;
}

export interface SessionRecord {
  id?: number;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  goodPostureRatio: number; // 0..1
  alertsCount: number;
  avgScore: number;
}

export interface AlertRecord {
  id?: number;
  sessionId?: number;
  type: "neck" | "back" | "shoulders" | "distance" | "longSit";
  severity: "warning" | "danger" | "voice";
  message: string;
  at: number;
}

export interface PomodoroRecord {
  id?: number;
  mode: "basic" | "extended" | "custom";
  focusMinutes: number;
  breakMinutes: number;
  completedAt: number;
}

export interface CalibrationBaseline {
  id: "default";
  neckAngle: number;
  backAngle: number;
  shoulderTilt: number;
  faceWidth: number; // for distance estimation
  capturedAt: number;
}

export interface AppSettings {
  id: "default";
  cameraId?: string;
  resolution: "480p" | "720p" | "1080p";
  modelTier: "lite" | "full" | "heavy";
  detectionThreshold: number; // 0..1
  maxFps: number;
  voiceEnabled: boolean;
  voiceVolume: number; // 0..1
  voiceName?: string;
  theme: "dark" | "light" | "system";
  alertWarningSec: number;
  alertDangerSec: number;
  alertVoiceSec: number;
  voiceCooldownSec: number;
}

export class PoseAlertDB extends Dexie {
  profile!: Table<UserProfile, "me">;
  sessions!: Table<SessionRecord, number>;
  alerts!: Table<AlertRecord, number>;
  pomodoros!: Table<PomodoroRecord, number>;
  calibration!: Table<CalibrationBaseline, "default">;
  settings!: Table<AppSettings, "default">;

  constructor() {
    super("PoseAlertAI");
    this.version(1).stores({
      profile: "id",
      sessions: "++id, startedAt, endedAt",
      alerts: "++id, sessionId, type, at",
      pomodoros: "++id, completedAt",
      calibration: "id",
      settings: "id",
    });
  }
}

// Lazy singleton (only on client)
let _db: PoseAlertDB | null = null;
export function getDB(): PoseAlertDB {
  if (typeof window === "undefined") {
    throw new Error("Database only available in browser");
  }
  if (!_db) _db = new PoseAlertDB();
  return _db;
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: "default",
  resolution: "720p",
  modelTier: "lite",
  detectionThreshold: 0.5,
  maxFps: 30,
  voiceEnabled: true,
  voiceVolume: 0.8,
  theme: "dark",
  alertWarningSec: 10,
  alertDangerSec: 20,
  alertVoiceSec: 30,
  voiceCooldownSec: 60,
};

export async function ensureDefaults(): Promise<AppSettings> {
  const db = getDB();
  const s = await db.settings.get("default");
  if (!s) {
    await db.settings.put(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  return s;
}
