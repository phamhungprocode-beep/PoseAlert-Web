/**
 * Web Speech API wrapper, prefers Vietnamese female voices.
 */
let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return resolve([]);
    const list = window.speechSynthesis.getVoices();
    if (list.length) {
      cachedVoices = list;
      return resolve(list);
    }
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices();
      resolve(cachedVoices);
    };
  });
}

export async function listVietnameseVoices(): Promise<SpeechSynthesisVoice[]> {
  const all = await loadVoices();
  return all.filter((v) => v.lang.toLowerCase().startsWith("vi"));
}

export async function listAllVoices(): Promise<SpeechSynthesisVoice[]> {
  return loadVoices();
}

function pickVoice(voiceName?: string): SpeechSynthesisVoice | undefined {
  if (!cachedVoices.length && typeof window !== "undefined") {
    cachedVoices = window.speechSynthesis?.getVoices?.() ?? [];
  }
  if (voiceName) {
    const v = cachedVoices.find((v) => v.name === voiceName);
    if (v) return v;
  }
  // Prefer female Vietnamese
  const vi = cachedVoices.filter((v) => v.lang.toLowerCase().startsWith("vi"));
  const female = vi.find((v) => /female|nữ|hoai|hoài|linh|mai/i.test(v.name));
  return female ?? vi[0];
}

export function speak(text: string, opts?: { volume?: number; voiceName?: string }) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const v = pickVoice(opts?.voiceName);
    if (v) utter.voice = v;
    utter.lang = v?.lang ?? "vi-VN";
    utter.volume = opts?.volume ?? 0.8;
    utter.rate = 1;
    utter.pitch = 1;
    window.speechSynthesis.speak(utter);
  } catch (e) {
    console.warn("TTS failed", e);
  }
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
}
