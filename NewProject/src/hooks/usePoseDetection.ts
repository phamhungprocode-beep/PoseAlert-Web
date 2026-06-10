/**
 * Full PostureAI pipeline:
 *   webcam -> MediaPipe Pose -> geometry -> EMA -> sliding window -> alerts
 */
import { useEffect, useRef, useState } from "react";
import { extractMetrics, classify, DEFAULT_THRESHOLDS } from "@/ai/PoseAnalyzer";
import { MetricsSmoother, BadPostureWindow } from "@/ai/TemporalSmoother";
import { CalibrationSession } from "@/ai/CalibrationEngine";
import { AlertEngine, type AlertType } from "@/ai/AlertEngine";
import { useAppStore, type LiveAnalysis } from "@/store/useAppStore";
import { getDB } from "@/database/db";
import { loadBaseline, saveBaseline } from "@/ai/CalibrationEngine";

export interface PoseAnalysis extends LiveAnalysis {} // back-compat

export function usePoseDetection(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const setAnalysis = useAppStore((s) => s.setAnalysis);
  const tickSession = useAppStore((s) => s.tickSession);
  const pushAlert = useAppStore((s) => s.pushAlert);
  const incAlerts = useAppStore((s) => s.incAlerts);
  const sessionActive = useAppStore((s) => s.session.active);
  const settings = useAppStore((s) => s.settings);
  const calibration = useAppStore((s) => s.calibration);
  const setCalibration = useAppStore((s) => s.setCalibration);
  const pomodoroPaused = useAppStore((s) => s.pomodoroRunning && s.pomodoroPhase === "break");

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setLocal] = useState<LiveAnalysis>({
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
  });

  const rafRef = useRef<number | null>(null);
  const landmarkerRef = useRef<unknown>(null);
  const lastTickRef = useRef<number>(0);
  const smootherRef = useRef(new MetricsSmoother());
  const windowRef = useRef(new BadPostureWindow(30, 0.7));
  const calibSessionRef = useRef(new CalibrationSession());
  const alertRef = useRef<AlertEngine | null>(null);
  const settingsRef = useRef(settings);
  const calibRef = useRef(calibration);
  const pausedRef = useRef(false);

  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { calibRef.current = calibration; }, [calibration]);
  useEffect(() => { pausedRef.current = pomodoroPaused; }, [pomodoroPaused]);

  // Init alert engine
  useEffect(() => {
    alertRef.current = new AlertEngine({
      warningSec: settings.alertWarningSec,
      dangerSec: settings.alertDangerSec,
      voiceSec: settings.alertVoiceSec,
      voiceCooldownSec: settings.voiceCooldownSec,
      voiceEnabled: () => settingsRef.current.voiceEnabled,
      voiceVolume: () => settingsRef.current.voiceVolume,
      onEvent: ({ type, severity, message }) => {
        pushAlert({ type, severity, message });
        if (sessionActive) incAlerts();
        // persist
        try {
          getDB().alerts.add({ type, severity, message, at: Date.now() });
        } catch {/* ignore */}
      },
    });
  }, [settings.alertWarningSec, settings.alertDangerSec, settings.alertVoiceSec, settings.voiceCooldownSec, pushAlert, sessionActive, incAlerts]);

  // Restore baseline once
  useEffect(() => {
    loadBaseline().then((b) => b && setCalibration(b));
  }, [setCalibration]);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;

    async function start() {
      try {
        const vision = await import("@mediapipe/tasks-vision");
        const fileset = await vision.FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
        );
        const tier = settingsRef.current.modelTier;
        const modelMap: Record<string, string> = {
          lite: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          full: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
          heavy: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task",
        };
        const landmarker = await vision.PoseLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: modelMap[tier] ?? modelMap.lite,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: settingsRef.current.detectionThreshold,
        });
        if (cancelled) return;
        landmarkerRef.current = landmarker;

        const resMap: Record<string, MediaTrackConstraints> = {
          "480p": { width: 640, height: 480 },
          "720p": { width: 1280, height: 720 },
          "1080p": { width: 1920, height: 1080 },
        };
        stream = await navigator.mediaDevices.getUserMedia({
          video: { ...resMap[settingsRef.current.resolution], facingMode: "user" },
          audio: false,
        });
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setReady(true);

        const tick = () => {
          if (cancelled) return;
          const now = performance.now();
          const dt = now - lastTickRef.current;
          lastTickRef.current = now;
          const fps = dt > 0 ? Math.round(1000 / dt) : 0;

          if (pausedRef.current) {
            rafRef.current = requestAnimationFrame(tick);
            return;
          }

          try {
            const result = (landmarker as any).detectForVideo(video, now);
            const lm = result?.landmarks?.[0];
            if (lm && lm.length) {
              const raw = extractMetrics(lm);
              if (!raw) {
                rafRef.current = requestAnimationFrame(tick);
                return;
              }
              const smooth = smootherRef.current.smooth(raw);
              if (calibSessionRef.current.active) calibSessionRef.current.feed(smooth);

              const verdict = classify(smooth, calibRef.current ? {
                neckAngle: calibRef.current.neckAngle,
                backAngle: calibRef.current.backAngle,
                shoulderTilt: calibRef.current.shoulderTilt,
                distanceCm: 60,
                faceWidth: calibRef.current.faceWidth,
                confidence: 1,
              } : null);

              const worst: AlertType =
                verdict.back === "poor" ? "back" :
                verdict.neck === "poor" ? "neck" :
                verdict.shoulders === "poor" ? "shoulders" :
                verdict.distance === "poor" ? "distance" : "back";
              const isBad = verdict.score < 55 && smooth.confidence > 0.5;
              const confirmed = windowRef.current.push(isBad);
              const { poorDurationSec } = alertRef.current!.tick(confirmed, worst);

              const next: LiveAnalysis = {
                score: verdict.score,
                confidence: smooth.confidence,
                back: verdict.back,
                neck: verdict.neck,
                shoulders: verdict.shoulders,
                distance: verdict.distance,
                neckAngle: smooth.neckAngle,
                backAngle: smooth.backAngle,
                shoulderTilt: smooth.shoulderTilt,
                distanceCm: smooth.distanceCm,
                fps,
                hasLandmarks: true,
                landmarks: lm,
                poorDurationSec,
              };
              setLocal(next);
              setAnalysis(next);
              tickSession(verdict.score, verdict.score >= 70);
            } else {
              setLocal((a) => ({ ...a, fps, hasLandmarks: false }));
              alertRef.current?.tick(false, "back");
            }
          } catch (e) {
            console.warn(e);
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        console.warn("Pose pipeline failed:", e);
        setError(e instanceof Error ? e.message : "Camera or model unavailable");
      }
    }
    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((t) => t.stop());
      try { (landmarkerRef.current as any)?.close?.(); } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.modelTier, settings.resolution]);

  // Calibration controls
  const startCalibration = () => {
    calibSessionRef.current.start();
  };
  const finishCalibration = async () => {
    const b = calibSessionRef.current.finish();
    if (b) {
      await saveBaseline(b);
      setCalibration(b);
    }
    return b;
  };
  const calibrating = () => calibSessionRef.current.active;
  const calibrationProgress = () => calibSessionRef.current.progress();

  return { analysis, ready, error, startCalibration, finishCalibration, calibrating, calibrationProgress };
}
