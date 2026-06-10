import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Camera, CameraOff, Loader2, AlertTriangle, ChevronDown, Sun, Zap, Sparkles,
} from "lucide-react";
import { usePhoneBroadcaster } from "@/hooks/usePhoneBroadcaster";
import { RESOLUTION_PRESETS, type ResolutionKey } from "@/lib/webrtc/cameraConstraints";
import type { CodecPref } from "@/lib/webrtc/codecPrefs";

export const Route = createFileRoute("/camera")({
  head: () => ({
    meta: [
      { title: "Camera Mode · PoseAlertAI" },
      { name: "description", content: "Biến điện thoại thành webcam không dây chất lượng cao." },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
    ],
  }),
  component: CameraPage,
});

const PRESETS: { key: "studio" | "ultra" | "low"; label: string; bitrate: number; res: ResolutionKey; fps: number }[] = [
  { key: "studio", label: "Studio", bitrate: 25000, res: "1440p", fps: 30 },
  { key: "ultra", label: "Ultra", bitrate: 50000, res: "4k", fps: 30 },
  { key: "low", label: "Low-Latency", bitrate: 8000, res: "1080p", fps: 60 },
];

function CameraPage() {
  const search = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const sessionId = search.get("s") ?? "";
  const [resolution, setResolution] = useState<ResolutionKey>("1080p");
  const [fps, setFps] = useState(30);
  const [bitrate, setBitrate] = useState(25000);
  const [deviceId, setDeviceId] = useState<string | undefined>();
  const [codecOrder] = useState<CodecPref[]>(["h265", "av1", "vp9", "h264"]);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { state, stream, start, stop, switchCamera, applyCameraAdvanced, setBitrate: applyBitrate, supportedCodecs } =
    usePhoneBroadcaster({ sessionId, resolution, fps, maxBitrateKbps: bitrate, deviceId, codecOrder });

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  useEffect(() => { applyBitrate(bitrate); }, [bitrate, applyBitrate]);

  const rearCams = useMemo(
    () => state.devices.filter((d) => !/front|self|user/i.test(d.label)),
    [state.devices],
  );

  if (!sessionId) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-black text-white">
        <div className="glass-card rounded-2xl p-6 max-w-sm text-center space-y-3">
          <AlertTriangle className="w-8 h-8 mx-auto text-amber-400" />
          <h1 className="text-lg font-semibold">Thiếu mã phiên</h1>
          <p className="text-sm text-muted-foreground">
            Hãy mở trang Viewer trên máy tính rồi quét mã QR bằng điện thoại để bắt đầu.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-black text-white relative overflow-hidden">
      <video
        ref={videoRef}
        muted playsInline autoPlay
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/60 via-transparent to-black/80" />

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between text-xs z-10">
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur border border-white/10 flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${
              state.status === "live" ? "bg-emerald-400 animate-pulse" :
              state.status === "error" ? "bg-red-400" : "bg-amber-400"
            }`} />
            {state.status.toUpperCase()}
          </div>
          {state.actualWidth > 0 && (
            <div className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur border border-white/10 font-mono">
              {state.actualWidth}×{state.actualHeight} · {state.actualFps}fps
            </div>
          )}
        </div>
        <div className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur border border-white/10 font-mono">
          #{sessionId.slice(0, 6)}
        </div>
      </div>

      {/* Center status */}
      {state.status !== "live" && state.status !== "ready" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 pointer-events-none">
          {state.status === "permission" || state.status === "connecting" ? (
            <>
              <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
              <span className="text-sm">{state.status === "permission" ? "Đang xin quyền camera…" : "Đang kết nối…"}</span>
            </>
          ) : state.status === "error" ? (
            <div className="glass-card rounded-xl p-4 max-w-sm text-center mx-4">
              <AlertTriangle className="w-8 h-8 mx-auto text-red-400 mb-2" />
              <div className="text-sm font-medium mb-1">Lỗi kết nối</div>
              <div className="text-xs text-muted-foreground break-words">{state.error}</div>
            </div>
          ) : null}
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-0 inset-x-0 p-4 space-y-3 z-10">
        {/* Live stats */}
        {state.status === "live" && (
          <div className="grid grid-cols-4 gap-2 text-[10px]">
            {[
              { l: "BITRATE", v: `${state.outBitrateKbps} kbps` },
              { l: "PING", v: `${state.rttMs} ms` },
              { l: "LOSS", v: `${state.packetLossPct}%` },
              { l: "CODEC", v: (state.codec ?? "").replace("video/", "") || "—" },
            ].map((x) => (
              <div key={x.l} className="glass-card rounded-lg px-2 py-1.5 text-center">
                <div className="text-muted-foreground">{x.l}</div>
                <div className="font-mono font-medium tabular-nums">{x.v}</div>
              </div>
            ))}
          </div>
        )}

        {/* Presets */}
        <div className="flex gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => { setResolution(p.res); setFps(p.fps); setBitrate(p.bitrate); }}
              className="flex-1 glass-card rounded-xl p-2 text-xs hover:bg-white/5 transition"
            >
              <div className="font-semibold flex items-center justify-center gap-1">
                {p.key === "studio" ? <Sparkles className="w-3 h-3" /> :
                  p.key === "ultra" ? <Zap className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                {p.label}
              </div>
              <div className="text-[10px] text-muted-foreground">{p.res}·{p.fps}fps</div>
            </button>
          ))}
        </div>

        {/* Detailed controls */}
        <details className="glass-card rounded-xl p-3 text-xs">
          <summary className="flex items-center justify-between cursor-pointer">
            <span className="font-medium">Tùy chỉnh</span>
            <ChevronDown className="w-4 h-4" />
          </summary>
          <div className="mt-3 space-y-3">
            <Field label="Camera">
              <select
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2"
                value={deviceId ?? ""}
                onChange={(e) => {
                  const id = e.target.value || undefined;
                  setDeviceId(id);
                  if (id && state.status !== "idle") switchCamera(id);
                }}
              >
                <option value="">Tự động (camera sau)</option>
                {rearCams.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 4)}`}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Độ phân giải">
                <select
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as ResolutionKey)}
                >
                  {(Object.keys(RESOLUTION_PRESETS) as ResolutionKey[]).map((k) => (
                    <option key={k} value={k}>
                      {RESOLUTION_PRESETS[k].width}×{RESOLUTION_PRESETS[k].height}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="FPS">
                <select
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2"
                  value={fps} onChange={(e) => setFps(+e.target.value)}
                >
                  {[24, 30, 60, 120].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </Field>
            </div>
            <Field label={`Bitrate tối đa: ${bitrate} kbps`}>
              <input
                type="range" min={1000} max={50000} step={500}
                value={bitrate} onChange={(e) => setBitrate(+e.target.value)}
                className="w-full accent-cyan-400"
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => applyCameraAdvanced({ torch: true })} className="flex-1 glass-card rounded-lg p-2">Đèn pin</button>
              <button onClick={() => applyCameraAdvanced({ torch: false })} className="flex-1 glass-card rounded-lg p-2">Tắt đèn</button>
              <button onClick={() => applyCameraAdvanced({ focusMode: "continuous" })} className="flex-1 glass-card rounded-lg p-2">AF</button>
              <button onClick={() => applyCameraAdvanced({ focusMode: "manual" })} className="flex-1 glass-card rounded-lg p-2">Khoá nét</button>
            </div>
            <div className="text-[10px] text-muted-foreground">
              Codec hỗ trợ: {supportedCodecs.join(", ") || "—"}
            </div>
          </div>
        </details>

        {/* Big action */}
        {state.status === "idle" || state.status === "ended" || state.status === "error" ? (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={start}
            className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 font-semibold text-base text-white"
            style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)", boxShadow: "0 10px 30px -8px rgba(6,182,212,0.6)" }}
          >
            <Camera className="w-5 h-5" /> Bắt đầu phát
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={stop}
            className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 font-semibold text-base bg-red-500/90 hover:bg-red-500"
          >
            <CameraOff className="w-5 h-5" /> Dừng phát
          </motion.button>
        )}
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
