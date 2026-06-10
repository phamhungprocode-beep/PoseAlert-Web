/**
 * Helpers for picking the best rear camera and constructing high-quality constraints.
 */
export const RESOLUTION_PRESETS = {
  "1080p": { width: 1920, height: 1080 },
  "1440p": { width: 2560, height: 1440 },
  "4k": { width: 3840, height: 2160 },
  "8k": { width: 7680, height: 4320 },
} as const;
export type ResolutionKey = keyof typeof RESOLUTION_PRESETS;

export async function listVideoInputs(): Promise<MediaDeviceInfo[]> {
  const all = await navigator.mediaDevices.enumerateDevices();
  return all.filter((d) => d.kind === "videoinput");
}

/**
 * Pick the "best" rear (environment) camera. Heuristic: prefer labels containing
 * "back"/"rear"/"environment", then those with "wide"/"main"/"0" markers, and
 * de-prioritise ultra-wide / telephoto if a normal main is available.
 */
export function pickMainRearCamera(devices: MediaDeviceInfo[]): MediaDeviceInfo | null {
  if (!devices.length) return null;
  const score = (d: MediaDeviceInfo) => {
    const l = d.label.toLowerCase();
    let s = 0;
    if (/back|rear|environment|sau/.test(l)) s += 50;
    if (/main|wide(?!.*ultra)|standard|primary/.test(l)) s += 30;
    if (/camera2 0|camera 0|^0/.test(l)) s += 15;
    if (/ultra|tele|macro|depth|mono|ir|front|self|user/.test(l)) s -= 40;
    if (/front|user|self/.test(l)) s -= 100;
    return s;
  };
  const sorted = [...devices].sort((a, b) => score(b) - score(a));
  return sorted[0] ?? null;
}

export function buildVideoConstraints(opts: {
  deviceId?: string;
  resolution: ResolutionKey;
  fps: number;
  preferRear: boolean;
}): MediaStreamConstraints {
  const { width, height } = RESOLUTION_PRESETS[opts.resolution];
  const video: MediaTrackConstraints = {
    width: { ideal: width, max: width },
    height: { ideal: height, max: height },
    frameRate: { ideal: opts.fps, max: opts.fps },
    aspectRatio: { ideal: width / height },
  };
  if (opts.deviceId) {
    video.deviceId = { exact: opts.deviceId };
  } else if (opts.preferRear) {
    video.facingMode = { ideal: "environment" };
  }
  return { video, audio: false };
}

/** Apply advanced controls if supported by the active track. */
export async function applyAdvanced(
  track: MediaStreamTrack,
  patch: Partial<{
    zoom: number;
    torch: boolean;
    focusMode: "auto" | "manual" | "continuous";
    focusDistance: number;
    exposureMode: "auto" | "manual" | "continuous";
    exposureCompensation: number;
    whiteBalanceMode: "auto" | "manual" | "continuous";
    iso: number;
  }>,
) {
  // Cast: standard TS lib lacks ImageCapture advanced constraints.
  try {
    const caps = (track.getCapabilities?.() ?? {}) as Record<string, unknown>;
    const advanced: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === null) continue;
      if (k in caps) advanced[k] = v;
    }
    if (Object.keys(advanced).length) {
      await (track as MediaStreamTrack & {
        applyConstraints: (c: { advanced: unknown[] }) => Promise<void>;
      }).applyConstraints({ advanced: [advanced] });
    }
  } catch {/* noop */}
}
