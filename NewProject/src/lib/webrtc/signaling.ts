/**
 * WebRTC signaling over Supabase Realtime broadcast channels.
 * No DB tables needed — ephemeral pub/sub keyed by sessionId.
 */
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type SignalRole = "phone" | "viewer";

export type SignalMessage =
  | { kind: "hello"; role: SignalRole }
  | { kind: "bye"; role: SignalRole }
  | { kind: "offer"; sdp: RTCSessionDescriptionInit }
  | { kind: "answer"; sdp: RTCSessionDescriptionInit }
  | { kind: "ice"; candidate: RTCIceCandidateInit }
  | { kind: "control"; payload: Record<string, unknown> };

export interface SignalingClient {
  channel: RealtimeChannel;
  send: (msg: SignalMessage) => Promise<void>;
  close: () => Promise<void>;
}

export function makeSessionId(): string {
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 12);
}

export async function joinSignaling(
  sessionId: string,
  role: SignalRole,
  onMessage: (msg: SignalMessage, fromRole: SignalRole) => void,
): Promise<SignalingClient> {
  const topic = `pose-cam:${sessionId}`;
  const channel = supabase.channel(topic, {
    config: { broadcast: { self: false, ack: false } },
  });

  channel.on("broadcast", { event: "signal" }, (payload) => {
    const data = payload.payload as { msg: SignalMessage; from: SignalRole };
    if (!data || data.from === role) return;
    onMessage(data.msg, data.from);
  });

  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("signaling subscribe timeout")), 8000);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(t);
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(t);
        reject(new Error(`signaling ${status}`));
      }
    });
  });

  const send = async (msg: SignalMessage) => {
    await channel.send({
      type: "broadcast",
      event: "signal",
      payload: { msg, from: role },
    });
  };

  const close = async () => {
    try {
      await send({ kind: "bye", role });
    } catch { /* noop */ }
    await supabase.removeChannel(channel);
  };

  return { channel, send, close };
}

export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];
