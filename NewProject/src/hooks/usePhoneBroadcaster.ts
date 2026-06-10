/**
 * Phone-side broadcaster: opens rear camera, joins signaling channel,
 * creates a WebRTC offer with the video track, and waits for the viewer's answer.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import {
  joinSignaling,
  ICE_SERVERS,
  type SignalingClient,
  type SignalMessage,
} from "@/lib/webrtc/signaling";
import {
  applyCodecPreference,
  applyMaxBitrate,
  applyMaxFramerate,
  getSupportedSendCodecs,
  type CodecPref,
} from "@/lib/webrtc/codecPrefs";
import {
  buildVideoConstraints,
  listVideoInputs,
  pickMainRearCamera,
  applyAdvanced,
  type ResolutionKey,
} from "@/lib/webrtc/cameraConstraints";

export interface PhoneOptions {
  sessionId: string;
  resolution: ResolutionKey;
  fps: number;
  maxBitrateKbps: number;
  deviceId?: string;
  codecOrder?: CodecPref[];
}

export interface PhoneState {
  status: "idle" | "permission" | "ready" | "connecting" | "live" | "ended" | "error";
  error?: string;
  actualWidth: number;
  actualHeight: number;
  actualFps: number;
  outBitrateKbps: number;
  rttMs: number;
  packetLossPct: number;
  codec?: string;
  devices: MediaDeviceInfo[];
}

export function usePhoneBroadcaster(opts: PhoneOptions) {
  const [state, setState] = useState<PhoneState>({
    status: "idle",
    actualWidth: 0,
    actualHeight: 0,
    actualFps: 0,
    outBitrateKbps: 0,
    rttMs: 0,
    packetLossPct: 0,
    devices: [],
  });
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sigRef = useRef<SignalingClient | null>(null);
  const senderRef = useRef<RTCRtpSender | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const update = (p: Partial<PhoneState>) => setState((s) => ({ ...s, ...p }));

  // Enumerate devices when permission granted
  useEffect(() => {
    const refresh = () => listVideoInputs().then((devices) => update({ devices }));
    refresh();
    navigator.mediaDevices.addEventListener?.("devicechange", refresh);
    return () => navigator.mediaDevices.removeEventListener?.("devicechange", refresh);
  }, []);

  const start = useCallback(async () => {
    if (pcRef.current) return;
    try {
      update({ status: "permission" });
      // Acquire camera
      const devices = await listVideoInputs();
      const targetId = opts.deviceId ?? pickMainRearCamera(devices)?.deviceId;
      const constraints = buildVideoConstraints({
        deviceId: targetId,
        resolution: opts.resolution,
        fps: opts.fps,
        preferRear: true,
      });
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      // Refresh devices to get labels (some browsers reveal them post-permission)
      const enriched = await listVideoInputs();
      const settings = stream.getVideoTracks()[0]?.getSettings() ?? {};
      update({
        status: "ready",
        devices: enriched,
        actualWidth: settings.width ?? 0,
        actualHeight: settings.height ?? 0,
        actualFps: Math.round(settings.frameRate ?? 0),
      });

      // Build PC + add track
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, bundlePolicy: "max-bundle" });
      pcRef.current = pc;
      const [track] = stream.getVideoTracks();
      const transceiver = pc.addTransceiver(track, { direction: "sendonly" });
      senderRef.current = transceiver.sender;
      const order: CodecPref[] = opts.codecOrder ?? ["h265", "av1", "vp9", "h264"];
      applyCodecPreference(transceiver, order);
      await applyMaxBitrate(transceiver.sender, opts.maxBitrateKbps);
      await applyMaxFramerate(transceiver.sender, opts.fps);

      // Signaling
      const sig = await joinSignaling(opts.sessionId, "phone", async (msg) => {
        await handle(msg);
      });
      sigRef.current = sig;
      await sig.send({ kind: "hello", role: "phone" });

      pc.onicecandidate = (e) => {
        if (e.candidate) sig.send({ kind: "ice", candidate: e.candidate.toJSON() });
      };
      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        if (s === "connected") update({ status: "live" });
        else if (s === "failed" || s === "disconnected") update({ status: "error", error: `peer ${s}` });
        else if (s === "closed") update({ status: "ended" });
      };

      // Wait for viewer-hello then create offer
      const handle = async (msg: SignalMessage) => {
        if (!pcRef.current) return;
        if (msg.kind === "hello") {
          await makeOffer();
        } else if (msg.kind === "answer") {
          await pcRef.current.setRemoteDescription(msg.sdp);
        } else if (msg.kind === "ice") {
          try { await pcRef.current.addIceCandidate(msg.candidate); } catch {/* noop */}
        }
      };

      const makeOffer = async () => {
        update({ status: "connecting" });
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sig.send({ kind: "offer", sdp: offer });
      };

      // If viewer is already there, ask via hello.
      // (Viewer also sends hello on join — see hook.)
    } catch (e) {
      update({ status: "error", error: e instanceof Error ? e.message : String(e) });
    }
  }, [opts.sessionId, opts.resolution, opts.fps, opts.maxBitrateKbps, opts.deviceId, opts.codecOrder]);

  const stop = useCallback(async () => {
    try { pcRef.current?.close(); } catch { /* noop */ }
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    await sigRef.current?.close();
    sigRef.current = null;
    update({ status: "ended" });
  }, []);

  // Stats polling
  useEffect(() => {
    if (state.status !== "live" && state.status !== "connecting") return;
    let prevBytes = 0;
    let prevTs = 0;
    const id = window.setInterval(async () => {
      const pc = pcRef.current;
      if (!pc) return;
      const stats = await pc.getStats();
      let bytes = 0;
      let ts = 0;
      let rtt = 0;
      let loss = 0;
      let packetsSent = 0;
      let packetsLost = 0;
      let codec = "";
      stats.forEach((r) => {
        if (r.type === "outbound-rtp" && (r as RTCStats & { kind?: string }).kind === "video") {
          const o = r as RTCStats & { bytesSent: number; timestamp: number; packetsSent: number; codecId?: string };
          bytes = o.bytesSent;
          ts = o.timestamp;
          packetsSent = o.packetsSent;
          if (o.codecId) {
            const c = stats.get(o.codecId) as (RTCStats & { mimeType?: string }) | undefined;
            if (c?.mimeType) codec = c.mimeType;
          }
        }
        if (r.type === "remote-inbound-rtp") {
          const ri = r as RTCStats & { roundTripTime?: number; packetsLost?: number };
          rtt = (ri.roundTripTime ?? 0) * 1000;
          packetsLost = ri.packetsLost ?? 0;
        }
      });
      const dt = (ts - prevTs) / 1000;
      const kbps = prevTs && dt > 0 ? Math.round(((bytes - prevBytes) * 8) / dt / 1000) : 0;
      prevBytes = bytes;
      prevTs = ts;
      loss = packetsSent > 0 ? (packetsLost / packetsSent) * 100 : 0;
      update({ outBitrateKbps: kbps, rttMs: Math.round(rtt), packetLossPct: +loss.toFixed(2), codec });
    }, 1000);
    return () => clearInterval(id);
  }, [state.status]);

  const switchCamera = useCallback(async (deviceId: string) => {
    if (!streamRef.current || !senderRef.current) return;
    const constraints = buildVideoConstraints({
      deviceId, resolution: optsRef.current.resolution, fps: optsRef.current.fps, preferRear: true,
    });
    const newStream = await navigator.mediaDevices.getUserMedia(constraints);
    const newTrack = newStream.getVideoTracks()[0];
    await senderRef.current.replaceTrack(newTrack);
    streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = newStream;
    const s = newTrack.getSettings();
    update({ actualWidth: s.width ?? 0, actualHeight: s.height ?? 0, actualFps: Math.round(s.frameRate ?? 0) });
  }, []);

  const applyCameraAdvanced = useCallback(async (patch: Parameters<typeof applyAdvanced>[1]) => {
    const t = streamRef.current?.getVideoTracks()[0];
    if (t) await applyAdvanced(t, patch);
  }, []);

  const setBitrate = useCallback(async (kbps: number) => {
    if (senderRef.current) await applyMaxBitrate(senderRef.current, kbps);
  }, []);

  return {
    state,
    stream: streamRef.current,
    streamRef,
    start, stop,
    switchCamera, applyCameraAdvanced, setBitrate,
    supportedCodecs: getSupportedSendCodecs(),
  };
}
