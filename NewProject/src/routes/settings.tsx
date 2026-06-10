import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useAppStore } from "@/store/useAppStore";
import { getDB, DEFAULT_SETTINGS, type AppSettings } from "@/database/db";
import { listAllVoices, speak } from "@/services/voiceAlerts";
import toast from "react-hot-toast";
import { Volume2, Camera, Cpu, Palette, Database, Trash2, Download, Upload } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Cài đặt · PoseAlertAI" }] }),
  component: SettingsPage,
});

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5">
          <Icon className="w-4 h-4 text-[var(--neon-cyan)]" />
        </div>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function SettingsPage() {
  const settings = useAppStore((s) => s.settings);
  const loadSettings = useAppStore((s) => s.loadSettings);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((d) => setCameras(d.filter((x) => x.kind === "videoinput")));
    }
    listAllVoices().then(setVoices);
  }, []);

  const update = async (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    await getDB().settings.put(next);
    loadSettings(next);
  };

  const reset = async () => {
    await getDB().settings.put(DEFAULT_SETTINGS);
    loadSettings(DEFAULT_SETTINGS);
    toast.success("Đã khôi phục mặc định");
  };

  const exportData = async () => {
    const db = getDB();
    const data = {
      profile: await db.profile.toArray(),
      sessions: await db.sessions.toArray(),
      alerts: await db.alerts.toArray(),
      pomodoros: await db.pomodoros.toArray(),
      calibration: await db.calibration.toArray(),
      settings: await db.settings.toArray(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `posealert-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Đã sao lưu dữ liệu");
  };

  const importData = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const db = getDB();
      await db.transaction(
        "rw",
        [db.profile, db.sessions, db.alerts, db.pomodoros, db.calibration, db.settings],
        async () => {
          if (data.profile) await db.profile.bulkPut(data.profile);
          if (data.sessions) await db.sessions.bulkAdd(data.sessions);
          if (data.alerts) await db.alerts.bulkAdd(data.alerts);
          if (data.pomodoros) await db.pomodoros.bulkAdd(data.pomodoros);
          if (data.calibration) await db.calibration.bulkPut(data.calibration);
          if (data.settings) await db.settings.bulkPut(data.settings);
        },
      );
      toast.success("Đã khôi phục dữ liệu");
    } catch (e) {
      toast.error("File không hợp lệ");
    }
  };

  const wipe = async () => {
    if (!confirm("Xoá toàn bộ dữ liệu? Hành động không thể hoàn tác.")) return;
    const db = getDB();
    await Promise.all([
      db.sessions.clear(), db.alerts.clear(), db.pomodoros.clear(),
      db.calibration.clear(), db.profile.clear(), db.settings.clear(),
    ]);
    toast.success("Đã xoá toàn bộ");
    location.reload();
  };

  return (
    <DashboardShell>
      <div className="space-y-6 max-w-4xl">
        <h2 className="text-xl font-semibold">Cài đặt</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Section icon={Camera} title="Camera">
            <Row label="Camera">
              <select value={settings.cameraId ?? ""} onChange={(e) => update({ cameraId: e.target.value })}
                className="bg-white/5 rounded-lg px-3 py-1.5 text-sm outline-none">
                <option value="">Mặc định</option>
                {cameras.map((c) => <option key={c.deviceId} value={c.deviceId}>{c.label || "Camera"}</option>)}
              </select>
            </Row>
            <Row label="Độ phân giải">
              <select value={settings.resolution} onChange={(e) => update({ resolution: e.target.value as any })}
                className="bg-white/5 rounded-lg px-3 py-1.5 text-sm outline-none">
                <option value="480p">480p</option>
                <option value="720p">720p</option>
                <option value="1080p">1080p</option>
              </select>
            </Row>
          </Section>

          <Section icon={Cpu} title="AI">
            <Row label="Model">
              <select value={settings.modelTier} onChange={(e) => update({ modelTier: e.target.value as any })}
                className="bg-white/5 rounded-lg px-3 py-1.5 text-sm outline-none">
                <option value="lite">MediaPipe Pose Lite</option>
                <option value="full">MediaPipe Pose Full</option>
                <option value="heavy">MediaPipe Pose Heavy</option>
              </select>
            </Row>
            <Row label={`Ngưỡng phát hiện (${settings.detectionThreshold.toFixed(2)})`}>
              <input type="range" min={0.3} max={0.9} step={0.05}
                value={settings.detectionThreshold}
                onChange={(e) => update({ detectionThreshold: +e.target.value })} />
            </Row>
            <Row label={`FPS tối đa (${settings.maxFps})`}>
              <input type="range" min={10} max={60} step={5}
                value={settings.maxFps}
                onChange={(e) => update({ maxFps: +e.target.value })} />
            </Row>
          </Section>

          <Section icon={Volume2} title="Âm thanh">
            <Row label="Bật cảnh báo giọng nói">
              <input type="checkbox" checked={settings.voiceEnabled} onChange={(e) => update({ voiceEnabled: e.target.checked })} />
            </Row>
            <Row label={`Âm lượng (${Math.round(settings.voiceVolume * 100)}%)`}>
              <input type="range" min={0} max={1} step={0.05}
                value={settings.voiceVolume}
                onChange={(e) => update({ voiceVolume: +e.target.value })} />
            </Row>
            <Row label="Giọng đọc">
              <select value={settings.voiceName ?? ""} onChange={(e) => update({ voiceName: e.target.value || undefined })}
                className="bg-white/5 rounded-lg px-3 py-1.5 text-sm outline-none max-w-[220px]">
                <option value="">Mặc định</option>
                {voices.map((v) => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
              </select>
            </Row>
            <button onClick={() => speak("Hãy ngồi thẳng lưng để bảo vệ cột sống.", { volume: settings.voiceVolume, voiceName: settings.voiceName })}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5">
              Nghe thử
            </button>
          </Section>

          <Section icon={Palette} title="Giao diện">
            <Row label="Theme">
              <select value={settings.theme} onChange={(e) => update({ theme: e.target.value as any })}
                className="bg-white/5 rounded-lg px-3 py-1.5 text-sm outline-none">
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">System</option>
              </select>
            </Row>
            <Row label={`Cảnh báo vàng sau (${settings.alertWarningSec}s)`}>
              <input type="range" min={5} max={30} step={1}
                value={settings.alertWarningSec}
                onChange={(e) => update({ alertWarningSec: +e.target.value })} />
            </Row>
            <Row label={`Cảnh báo đỏ sau (${settings.alertDangerSec}s)`}>
              <input type="range" min={10} max={60} step={1}
                value={settings.alertDangerSec}
                onChange={(e) => update({ alertDangerSec: +e.target.value })} />
            </Row>
            <Row label={`Giọng nói sau (${settings.alertVoiceSec}s)`}>
              <input type="range" min={15} max={120} step={1}
                value={settings.alertVoiceSec}
                onChange={(e) => update({ alertVoiceSec: +e.target.value })} />
            </Row>
          </Section>

          <Section icon={Database} title="Dữ liệu">
            <div className="flex flex-wrap gap-2">
              <button onClick={exportData} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 hover:bg-white/5">
                <Download className="w-3.5 h-3.5" /> Sao lưu
              </button>
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 hover:bg-white/5 cursor-pointer">
                <Upload className="w-3.5 h-3.5" /> Khôi phục
                <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
              </label>
              <button onClick={reset} className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5">
                Khôi phục mặc định
              </button>
              <button onClick={wipe} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--neon-red)]/30 text-[var(--neon-red)] hover:bg-[var(--neon-red)]/10">
                <Trash2 className="w-3.5 h-3.5" /> Xoá toàn bộ dữ liệu
              </button>
            </div>
          </Section>
        </div>
      </div>
    </DashboardShell>
  );
}
