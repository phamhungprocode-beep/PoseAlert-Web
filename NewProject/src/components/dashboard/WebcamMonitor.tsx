import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Camera, Loader2, Target } from "lucide-react";
import { usePoseDetection } from "@/hooks/usePoseDetection";
import { useAppStore } from "@/store/useAppStore";

const CONNECTIONS: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27],
  [24, 26], [26, 28], [0, 11], [0, 12],
];

export function WebcamMonitor() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { analysis, ready, error, startCalibration, finishCalibration, calibrationProgress } = usePoseDetection(videoRef);
  const isPoor = analysis.score > 0 && analysis.score < 50;
  const poorSec = analysis.poorDurationSec;
  const settings = useAppStore((s) => s.settings);

  const [calibrating, setCalibrating] = useState(false);
  const [calibProgress, setCalibProgress] = useState(0);

  // Calibration UI ticker
  useEffect(() => {
    if (!calibrating) return;
    const id = window.setInterval(async () => {
      const p = calibrationProgress();
      setCalibProgress(p);
      if (p >= 1) {
        clearInterval(id);
        await finishCalibration();
        setCalibrating(false);
      }
    }, 100);
    return () => clearInterval(id);
  }, [calibrating, calibrationProgress, finishCalibration]);

  const handleCalibrate = () => {
    setCalibProgress(0);
    setCalibrating(true);
    startCalibration();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = video.videoWidth || canvas.clientWidth;
    const h = video.videoHeight || canvas.clientHeight;
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    if (!analysis.hasLandmarks || analysis.landmarks.length === 0) return;

    const accent = poorSec >= settings.alertDangerSec ? "#ef4444" : poorSec >= settings.alertWarningSec ? "#f59e0b" : "#06b6d4";
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 8;
    CONNECTIONS.forEach(([a, b]) => {
      const p1 = analysis.landmarks[a];
      const p2 = analysis.landmarks[b];
      if (!p1 || !p2) return;
      ctx.beginPath();
      ctx.moveTo(p1.x * w, p1.y * h);
      ctx.lineTo(p2.x * w, p2.y * h);
      ctx.stroke();
    });
    ctx.fillStyle = accent;
    analysis.landmarks.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [analysis, poorSec, settings.alertDangerSec, settings.alertWarningSec]);

  const danger = poorSec >= settings.alertDangerSec;
  const warn = poorSec >= settings.alertWarningSec && !danger;

  return (
    <div
      className={`relative glass-card rounded-2xl overflow-hidden h-full min-h-[420px] transition-shadow ${danger ? "animate-pulse-danger" : ""}`}
      style={danger ? { boxShadow: "var(--shadow-glow-red)" } : { boxShadow: "var(--shadow-glow)" }}
    >
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur border border-white/10 text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-red)] animate-pulse" />
          LIVE
        </div>
        <div className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur border border-white/10 text-[11px] text-muted-foreground">
          MediaPipe · {settings.modelTier}
        </div>
        <button
          onClick={handleCalibrate}
          disabled={!ready || calibrating}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--neon-cyan)]/15 border border-[var(--neon-cyan)]/30 text-[11px] text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/25 transition disabled:opacity-40"
        >
          <Target className="w-3 h-3" />
          {calibrating ? `Đang hiệu chỉnh... ${Math.round(calibProgress * 100)}%` : "Hiệu chỉnh"}
        </button>
      </div>
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <div className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur border border-white/10 text-[11px] font-mono">
          {analysis.fps} FPS
        </div>
        <div className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur border border-white/10 text-[11px] font-mono">
          {Math.round(analysis.confidence * 100)}%
        </div>
      </div>

      <div className="relative w-full h-full bg-black">
        <video ref={videoRef} muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-90" style={{ transform: "scaleX(-1)" }} />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ transform: "scaleX(-1)" }} />

        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.65) 100%)" }} />

        {!ready && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--neon-cyan)]" />
            <span className="text-sm">Đang tải AI pose model…</span>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground p-6 text-center">
            <Camera className="w-10 h-10 text-[var(--neon-cyan)]" />
            <div className="text-sm font-medium text-foreground">Không truy cập được webcam</div>
            <div className="text-xs max-w-sm">Hãy cho phép quyền camera để bật giám sát tư thế.</div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {(warn || danger) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-10"
          >
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur border"
              style={{
                color: danger ? "#ef4444" : "#f59e0b",
                borderColor: danger ? "rgba(239,68,68,0.4)" : "rgba(245,158,11,0.4)",
                background: danger ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
              }}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {danger ? "Sai tư thế! Hãy điều chỉnh ngay" : "Cần điều chỉnh tư thế"} · {Math.round(poorSec)}s
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-0 inset-x-0 p-4 z-10">
        <div className="glass-card rounded-xl px-4 py-3 text-xs sm:text-sm flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
            <Camera className="w-4 h-4 text-white" />
          </div>
          <div className="leading-snug flex-1">
            <div className="font-medium">AI Guidance</div>
            <div className="text-muted-foreground">
              {analysis.distanceCm < 40
                ? "Bạn đang ngồi quá gần — hãy lùi lại."
                : analysis.neck === "poor"
                ? "Hãy nâng cằm lên, đừng cúi cổ."
                : analysis.back === "poor"
                ? "Hãy ngồi thẳng lưng."
                : "Giữ lưng thẳng và cân bằng vai."}
            </div>
          </div>
          <div className="hidden md:flex flex-col items-end text-[10px] text-muted-foreground">
            <span>Cổ {Math.round(analysis.neckAngle)}° · Lưng {Math.round(analysis.backAngle)}°</span>
            <span>Vai {Math.round(analysis.shoulderTilt)}° · ~{analysis.distanceCm}cm</span>
          </div>
        </div>
      </div>
    </div>
  );
}
