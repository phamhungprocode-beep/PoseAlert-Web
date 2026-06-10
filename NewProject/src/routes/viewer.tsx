import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Maximize, PictureInPicture2, Camera as CameraIcon, Circle, Square,
  RefreshCw, Smartphone, AlertTriangle, Loader2,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useViewerReceiver } from "@/hooks/useViewerReceiver";
import { makeSessionId } from "@/lib/webrtc/signaling";

export const Route = createFileRoute("/viewer")({
  head: () => ({
    meta: [
      { title: "Phone Cam Viewer · PoseAlertAI" },
      { name: "description", content: "Nhận luồng video từ điện thoại qua WebRTC, dùng làm webcam không dây chất lượng cao." },
    ],
  }),
  component: ViewerPage,
});

/**
 * Tạo URL công khai mà bất kỳ điện thoại nào cũng truy cập được (không cần đăng nhập Lovable).
 * - Preview nội bộ: id-preview--<id>.lovable.app  → chỉ Lovable workspace mở được.
 *   → Đổi sang dạng stable: project--<id>-dev.lovable.app (preview công khai).
 * - Published / custom domain: giữ nguyên origin.
 */
function getPublicOrigin(): string {
  if (typeof window === "undefined") return "";
  const { hostname, origin, protocol } = window.location;
  const m = hostname.match(/^id-preview--([0-9a-f-]+)\.lovable\.app$/i);
  if (m) return `${protocol}//project--${m[1]}-dev.lovable.app`;
  return origin;
}

function ViewerPage() {
  const [sessionId, setSessionId] = useState<string>(() => makeSessionId());
  const [qrUrl, setQrUrl] = useState<string>("");
  const [customOrigin, setCustomOrigin] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const { state, stream, hangup } = useViewerReceiver(sessionId);
  const recRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [copied, setCopied] = useState(false);

  const pairUrl = useMemo(() => {
    const base = customOrigin.trim().replace(/\/$/, "") || getPublicOrigin();
    if (!base) return "";
    return `${base}/camera?s=${sessionId}`;
  }, [sessionId, customOrigin]);

  useEffect(() => {
    if (!pairUrl) return;
    QRCode.toDataURL(pairUrl, { width: 320, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } })
      .then(setQrUrl).catch(() => setQrUrl(""));
  }, [pairUrl]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  const newSession = () => { hangup().finally(() => setSessionId(makeSessionId())); };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(pairUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {/* noop */}
  };

  const goFullscreen = () => videoRef.current?.requestFullscreen?.();
  const goPip = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch {/* noop */}
  };
  const snapshot = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    c.toBlob((b) => {
      if (!b) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = `snapshot-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, "image/png");
  };
  const toggleRecord = () => {
    if (recording) {
      recRef.current?.stop();
      setRecording(false);
      return;
    }
    if (!stream) return;
    const chunks: Blob[] = [];
    const types = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    const mime = types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "video/webm";
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 25_000_000 });
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: mime });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `recording-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(a.href);
    };
    rec.start(1000);
    recRef.current = rec;
    setRecording(true);
  };

  return (
    <DashboardShell>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Video */}
        <div className="xl:col-span-2 glass-card rounded-2xl overflow-hidden relative min-h-[420px] flex items-center justify-center bg-black"
          style={{ boxShadow: "var(--shadow-glow)" }}
        >
          <video
            ref={videoRef} autoPlay playsInline
            className="absolute inset-0 w-full h-full object-contain bg-black"
          />
          {state.status !== "live" && (
            <div className="relative z-10 flex flex-col items-center gap-3 text-muted-foreground">
              {state.status === "error" ? (
                <>
                  <AlertTriangle className="w-10 h-10 text-red-400" />
                  <div className="text-sm">Lỗi: {state.error}</div>
                </>
              ) : (
                <>
                  <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
                  <div className="text-sm">
                    {state.status === "connecting" ? "Đang đàm phán WebRTC…" : "Đang chờ điện thoại quét mã QR…"}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Top stats overlay */}
          <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur border border-white/10">
              <span className={`w-1.5 h-1.5 rounded-full ${state.status === "live" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
              {state.status.toUpperCase()}
            </div>
            {state.width > 0 && (
              <div className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur border border-white/10 font-mono">
                {state.width}×{state.height} · {state.fps}fps
              </div>
            )}
            {state.codec && (
              <div className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur border border-white/10 font-mono">
                {state.codec.replace("video/", "")}
              </div>
            )}
            <div className="ml-auto px-2.5 py-1 rounded-full bg-black/50 backdrop-blur border border-white/10 font-mono">
              {state.bitrateKbps} kbps · {state.jitterMs}ms jitter · {state.packetLossPct}% loss
            </div>
          </div>

          {/* Bottom controls */}
          {state.status === "live" && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
              <ToolButton onClick={goFullscreen} icon={<Maximize className="w-4 h-4" />} label="Full" />
              <ToolButton onClick={goPip} icon={<PictureInPicture2 className="w-4 h-4" />} label="PiP" />
              <ToolButton onClick={snapshot} icon={<CameraIcon className="w-4 h-4" />} label="Snap" />
              <ToolButton
                onClick={toggleRecord}
                icon={recording ? <Square className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                label={recording ? "Stop" : "Rec"}
                accent={recording ? "danger" : undefined}
              />
            </div>
          )}
        </div>

        {/* Pairing card */}
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold">Kết nối điện thoại</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Mở camera trên điện thoại và quét mã QR bên dưới. Trang sẽ tự mở trong trình duyệt
              và yêu cầu quyền camera — hãy chọn camera sau để có chất lượng tốt nhất.
            </p>
            <div className="bg-white p-3 rounded-xl flex items-center justify-center">
              {qrUrl ? (
                <img src={qrUrl} alt="QR ghép cặp" className="w-full max-w-[260px] aspect-square" />
              ) : (
                <div className="w-full max-w-[260px] aspect-square flex items-center justify-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground break-all font-mono bg-black/30 rounded-lg p-2 border border-white/5">
              {pairUrl}
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyLink}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs glass-card rounded-lg py-2 hover:bg-white/5 transition"
              >
                {copied ? "Đã copy ✓" : "Copy link"}
              </button>
              <button
                onClick={newSession}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs glass-card rounded-lg py-2 hover:bg-white/5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Phiên mới
              </button>
            </div>
            <details className="text-[11px]">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Tuỳ chỉnh domain (nếu đã publish hoặc dùng custom domain)
              </summary>
              <input
                type="text"
                value={customOrigin}
                onChange={(e) => setCustomOrigin(e.target.value)}
                placeholder="https://your-domain.com"
                className="mt-2 w-full bg-black/40 border border-white/10 rounded-lg p-2 font-mono"
              />
              <p className="mt-1 text-muted-foreground">
                Để trống = tự động dùng URL công khai của project.
              </p>
            </details>
          </div>


          <div className="glass-card rounded-2xl p-5 space-y-2 text-xs">
            <h3 className="text-sm font-semibold">Mẹo chất lượng tối đa</h3>
            <ul className="space-y-1.5 text-muted-foreground list-disc list-inside">
              <li>Dùng WiFi 5GHz hoặc cùng mạng LAN để đạt 4K@30 / 1080p@60.</li>
              <li>Bật chế độ <em>Ultra</em> nếu mạng tốt; chọn <em>Low-Latency</em> khi cần phản hồi nhanh.</li>
              <li>Đặt điện thoại lên giá đỡ — chống rung điện tử sẽ kích hoạt tự động.</li>
              <li>Trên Android/Chrome hỗ trợ HEVC, codec H.265 sẽ được ưu tiên.</li>
            </ul>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function ToolButton({ onClick, icon, label, accent }: {
  onClick: () => void; icon: React.ReactNode; label: string; accent?: "danger";
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium backdrop-blur border transition ${
        accent === "danger"
          ? "bg-red-500/80 border-red-400/40 text-white hover:bg-red-500"
          : "bg-black/50 border-white/10 hover:bg-white/10"
      }`}
    >
      {icon} {label}
    </button>
  );
}
