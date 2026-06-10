/**
 * Viewer/PC-side receiver: joins signaling channel, accepts the phone's WebRTC offer,
 * and exposes the incoming MediaStream + stats.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  joinSignaling,
  ICE_SERVERS,
  type SignalingClient,
  type SignalMessage,
} from "@/lib/webrtc/signaling";

export interface ViewerState {
  status: "idle" | "waiting" | "connecting" | "live" | "ended" | "error";
  error?: string;
  width: number;
  height: number;
  fps: number;
  bitrateKbps: number;
  jitterMs: number;
  packetLossPct: number;
  codec?: string;
}

export function useViewerReceiver(sessionId: string | null) {
  const [state, setState] = useState<ViewerState>({
    status: "idle",
    width: 0,
    height: 0,
    fps: 0,
    bitrateKbps: 0,
    jitterMs: 0,
    packetLossPct: 0,
  });
  const [stream, setStream] = useState<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const sigRef = useRef<SignalingClient | null>(null);

  const update = (p: Partial<ViewerState>) => setState((s) => ({ ...s, ...p }));

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        update({ status: "waiting" });
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, bundlePolicy: "max-bundle" });
        pcRef.current = pc;

        pc.ontrack = (e) => {
          const [s] = e.streams;
          if (s) setStream(s);
        };
        pc.onconnectionstatechange = () => {
          const cs = pc.connectionState;
          if (cs === "connected") update({ status: "live" });
          else if (cs === "failed" || cs === "disconnected") update({ status: "error", error: `peer ${cs}` });
        };

        const sig = await joinSignaling(sessionId, "viewer", async (msg: SignalMessage) => {
          if (!pcRef.current) return;
          if (msg.kind === "offer") {
            update({ status: "connecting" });
            await pcRef.current.setRemoteDescription(msg.sdp);
            const ans = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(ans);
            await sig.send({ kind: "answer", sdp: ans });
          } else if (msg.kind === "ice") {
            try { await pcRef.current.addIceCandidate(msg.candidate); } catch {/* noop */}
          } else if (msg.kind === "bye") {
            update({ status: "ended" });
          }
        });
        if (cancelled) { await sig.close(); pc.close(); return; }
        sigRef.current = sig;
        pc.onicecandidate = (e) => {
          if (e.candidate) sig.send({ kind: "ice", candidate: e.candidate.toJSON() });
        };
        // Announce viewer so phone creates the offer.
        await sig.send({ kind: "hello", role: "viewer" });
      } catch (e) {
        update({ status: "error", error: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => {
      cancelled = true;
      pcRef.current?.close();
      pcRef.current = null;
      sigRef.current?.close();
      sigRef.current = null;
      setStream(null);
    };
  }, [sessionId]);

  // Stats
  useEffect(() => {
    if (state.status !== "live" && state.status !== "connecting") return;
    let prevBytes = 0;
    let prevTs = 0;
    let prevFrames = 0;
    const id = window.setInterval(async () => {
      const pc = pcRef.current;
      if (!pc) return;
      const stats = await pc.getStats();
      let bytes = 0, ts = 0, w = 0, h = 0, frames = 0, jitter = 0, pktRecv = 0, pktLost = 0, codec = "";
      stats.forEach((r) => {
        if (r.type === "inbound-rtp" && (r as RTCStats & { kind?: string }).kind === "video") {
          const o = r as RTCStats & {
            bytesReceived: number; timestamp: number; frameWidth?: number; frameHeight?: number;
            framesDecoded?: number; jitter?: number; packetsReceived?: number; packetsLost?: number;
            codecId?: string;
          };
          bytes = o.bytesReceived;
          ts = o.timestamp;
          w = o.frameWidth ?? 0; h = o.frameHeight ?? 0;
          frames = o.framesDecoded ?? 0;
          jitter = (o.jitter ?? 0) * 1000;
          pktRecv = o.packetsReceived ?? 0;
          pktLost = o.packetsLost ?? 0;
          if (o.codecId) {
            const c = stats.get(o.codecId) as (RTCStats & { mimeType?: string }) | undefined;
            if (c?.mimeType) codec = c.mimeType;
          }
        }
      });
      const dt = (ts - prevTs) / 1000;
      const kbps = prevTs && dt > 0 ? Math.round(((bytes - prevBytes) * 8) / dt / 1000) : 0;
      const fps = prevTs && dt > 0 ? Math.round((frames - prevFrames) / dt) : 0;
      prevBytes = bytes; prevTs = ts; prevFrames = frames;
      const loss = pktRecv + pktLost > 0 ? (pktLost / (pktRecv + pktLost)) * 100 : 0;
      update({
        bitrateKbps: kbps, width: w, height: h, fps,
        jitterMs: +jitter.toFixed(1), packetLossPct: +loss.toFixed(2), codec,
      });
    }, 1000);
    return () => clearInterval(id);
  }, [state.status]);

  const hangup = useCallback(async () => {
    await sigRef.current?.send({ kind: "bye", role: "viewer" });
    pcRef.current?.close();
    setStream(null);
    update({ status: "ended" });
  }, []);

  return { state, stream, hangup };
}
