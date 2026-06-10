/**
 * Timed alert escalation:
 *   poor > warningSec  -> warning (yellow)
 *   poor > dangerSec   -> danger (red)
 *   poor > voiceSec    -> voice message (cooldown enforced)
 */
import { speak } from "@/services/voiceAlerts";

export type AlertType = "neck" | "back" | "shoulders" | "distance" | "longSit";

const MESSAGES: Record<AlertType, string> = {
  back: "Bạn đang bị gù lưng. Hãy ngồi thẳng để bảo vệ cột sống.",
  neck: "Bạn đang cúi cổ quá thấp. Hãy nâng màn hình hoặc điều chỉnh tư thế.",
  shoulders: "Bạn đang nghiêng người sang một bên. Hãy ngồi cân bằng hơn.",
  distance: "Khoảng cách đến màn hình đang quá gần. Hãy ngồi lùi lại một chút.",
  longSit: "Bạn đã ngồi sai tư thế quá lâu. Hãy điều chỉnh ngay để tránh ảnh hưởng sức khỏe.",
};

interface CallbackArgs {
  type: AlertType;
  severity: "warning" | "danger" | "voice";
  message: string;
}

export class AlertEngine {
  private badStartedAt: number | null = null;
  private lastVoiceAt = 0;
  private lastSeverity: "warning" | "danger" | "voice" | "none" = "none";
  private fired = { warning: false, danger: false, voice: false };

  constructor(
    private opts: {
      warningSec: number;
      dangerSec: number;
      voiceSec: number;
      voiceCooldownSec: number;
      voiceEnabled: () => boolean;
      voiceVolume: () => number;
      onEvent: (a: CallbackArgs) => void;
    },
  ) {}

  /** call every frame */
  tick(isBad: boolean, worstType: AlertType): { poorDurationSec: number; severity: string } {
    const now = performance.now();
    if (!isBad) {
      this.badStartedAt = null;
      this.fired = { warning: false, danger: false, voice: false };
      this.lastSeverity = "none";
      return { poorDurationSec: 0, severity: "none" };
    }
    if (this.badStartedAt === null) this.badStartedAt = now;
    const sec = (now - this.badStartedAt) / 1000;

    if (sec >= this.opts.voiceSec && !this.fired.voice) {
      const cooldownOk = (Date.now() - this.lastVoiceAt) / 1000 >= this.opts.voiceCooldownSec;
      if (cooldownOk && this.opts.voiceEnabled()) {
        const msg = MESSAGES[worstType];
        speak(msg, { volume: this.opts.voiceVolume() });
        this.lastVoiceAt = Date.now();
        this.opts.onEvent({ type: worstType, severity: "voice", message: msg });
      }
      this.fired.voice = true;
      this.lastSeverity = "voice";
    } else if (sec >= this.opts.dangerSec && !this.fired.danger) {
      this.fired.danger = true;
      this.lastSeverity = "danger";
      this.opts.onEvent({ type: worstType, severity: "danger", message: MESSAGES[worstType] });
    } else if (sec >= this.opts.warningSec && !this.fired.warning) {
      this.fired.warning = true;
      this.lastSeverity = "warning";
      this.opts.onEvent({ type: worstType, severity: "warning", message: MESSAGES[worstType] });
    }

    return { poorDurationSec: sec, severity: this.lastSeverity };
  }

  reset() {
    this.badStartedAt = null;
    this.fired = { warning: false, danger: false, voice: false };
    this.lastSeverity = "none";
  }
}
