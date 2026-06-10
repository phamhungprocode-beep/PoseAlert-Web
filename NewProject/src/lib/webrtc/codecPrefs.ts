/**
 * Codec preference helpers using RTCRtpTransceiver.setCodecPreferences (no SDP munging).
 */
export type CodecPref = "h265" | "av1" | "vp9" | "h264" | "vp8";

const MIME: Record<CodecPref, string> = {
  h265: "video/H265",
  av1: "video/AV1",
  vp9: "video/VP9",
  h264: "video/H264",
  vp8: "video/VP8",
};

export function getSupportedSendCodecs(): CodecPref[] {
  if (typeof RTCRtpSender === "undefined" || !RTCRtpSender.getCapabilities) return [];
  const caps = RTCRtpSender.getCapabilities("video");
  if (!caps) return [];
  const mimes = caps.codecs.map((c) => c.mimeType.toLowerCase());
  return (Object.keys(MIME) as CodecPref[]).filter((k) =>
    mimes.includes(MIME[k].toLowerCase()),
  );
}

export function applyCodecPreference(transceiver: RTCRtpTransceiver, order: CodecPref[]) {
  try {
    const caps = RTCRtpSender.getCapabilities?.("video");
    if (!caps) return;
    const wanted: RTCRtpCodec[] = [];
    const rest: RTCRtpCodec[] = [];
    for (const c of caps.codecs) {
      const m = c.mimeType.toLowerCase();
      const idx = order.findIndex((p) => MIME[p].toLowerCase() === m);
      if (idx >= 0) wanted[idx] = wanted[idx] ?? c;
      else rest.push(c);
    }
    const ordered = [...wanted.filter(Boolean), ...rest];
    if (ordered.length) transceiver.setCodecPreferences(ordered);
  } catch {/* noop */}
}

export async function applyMaxBitrate(sender: RTCRtpSender, kbps: number) {
  try {
    const params = sender.getParameters();
    if (!params.encodings || !params.encodings.length) params.encodings = [{}];
    params.encodings[0].maxBitrate = kbps * 1000;
    params.encodings[0].priority = "high";
    params.encodings[0].networkPriority = "high";
    await sender.setParameters(params);
  } catch {/* noop */}
}

export async function applyMaxFramerate(sender: RTCRtpSender, fps: number) {
  try {
    const params = sender.getParameters();
    if (!params.encodings?.length) params.encodings = [{}];
    params.encodings[0].maxFramerate = fps;
    await sender.setParameters(params);
  } catch {/* noop */}
}
