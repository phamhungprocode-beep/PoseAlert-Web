/**
 * Zustand global state: live posture analysis, alerts, settings cache, session info.
 */
import { create } from "zustand";
import type { AppSettings, CalibrationBaseline } from "@/database/db";
import { DEFAULT_SETTINGS } from "@/database/db";

export type StatusLevel = "good" | "fair" | "poor";

export interface LiveAnalysis {
  score: number; // 0..100
  confidence: number; // 0..1
  back: StatusLevel;
  neck: StatusLevel;
  shoulders: StatusLevel;
  distance: StatusLevel;
  neckAngle: number;
  backAngle: number;
  shoulderTilt: number;
  distanceCm: number; // estimate
  fps: number;
  hasLandmarks: boolean;
  landmarks: { x: number; y: number; visibility?: number }[];
  poorDurationSec: number;
}

export interface LiveAlert {
  id: number;
  type: "neck" | "back" | "shoulders" | "distance" | "longSit";
  severity: "warning" | "danger" | "voice";
  message: string;
  at: number;
}

export interface SessionLive {
  active: boolean;
  startedAt: number | null;
  goodFrames: number;
  totalFrames: number;
  alertsCount: number;
  scoreSum: number;
}

interface AppState {
  settings: AppSettings;
  calibration: CalibrationBaseline | null;
  analysis: LiveAnalysis;
  alerts: LiveAlert[];
  session: SessionLive;
  pomodoroRunning: boolean;
  pomodoroPhase: "focus" | "break" | "idle";

  setSettings: (s: Partial<AppSettings>) => void;
  loadSettings: (s: AppSettings) => void;
  setCalibration: (c: CalibrationBaseline | null) => void;
  setAnalysis: (a: LiveAnalysis) => void;
  pushAlert: (a: Omit<LiveAlert, "id" | "at">) => void;
  clearAlerts: () => void;
  startSession: () => void;
  endSession: () => void;
  tickSession: (score: number, isGood: boolean) => void;
  incAlerts: () => void;
  setPomodoro: (running: boolean, phase: "focus" | "break" | "idle") => void;
}

const defaultAnalysis: LiveAnalysis = {
  score: 0,
  confidence: 0,
  back: "good",
  neck: "good",
  shoulders: "good",
  distance: "good",
  neckAngle: 0,
  backAngle: 0,
  shoulderTilt: 0,
  distanceCm: 60,
  fps: 0,
  hasLandmarks: false,
  landmarks: [],
  poorDurationSec: 0,
};

export const useAppStore = create<AppState>((set) => ({
  settings: DEFAULT_SETTINGS,
  calibration: null,
  analysis: defaultAnalysis,
  alerts: [],
  session: { active: false, startedAt: null, goodFrames: 0, totalFrames: 0, alertsCount: 0, scoreSum: 0 },
  pomodoroRunning: false,
  pomodoroPhase: "idle",

  setSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),
  loadSettings: (s) => set({ settings: s }),
  setCalibration: (c) => set({ calibration: c }),
  setAnalysis: (a) => set({ analysis: a }),
  pushAlert: (a) =>
    set((st) => ({
      alerts: [{ ...a, id: Date.now() + Math.random(), at: Date.now() }, ...st.alerts].slice(0, 50),
    })),
  clearAlerts: () => set({ alerts: [] }),
  startSession: () =>
    set({
      session: { active: true, startedAt: Date.now(), goodFrames: 0, totalFrames: 0, alertsCount: 0, scoreSum: 0 },
    }),
  endSession: () => set((st) => ({ session: { ...st.session, active: false } })),
  tickSession: (score, isGood) =>
    set((st) =>
      st.session.active
        ? {
            session: {
              ...st.session,
              totalFrames: st.session.totalFrames + 1,
              goodFrames: st.session.goodFrames + (isGood ? 1 : 0),
              scoreSum: st.session.scoreSum + score,
            },
          }
        : {},
    ),
  incAlerts: () => set((st) => ({ session: { ...st.session, alertsCount: st.session.alertsCount + 1 } })),
  setPomodoro: (running, phase) => set({ pomodoroRunning: running, pomodoroPhase: phase }),
}));
