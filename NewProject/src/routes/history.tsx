import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useLiveQuery } from "@/hooks/useLiveQuery";
import { getDB, type SessionRecord } from "@/database/db";
import { Search, Download, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "Lịch sử · PoseAlertAI" }] }),
  component: HistoryPage,
});

function formatDate(ms: number) {
  return new Date(ms).toLocaleString("vi-VN");
}
function formatDuration(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}p ${s}s`;
}

function toCSV(rows: SessionRecord[]) {
  const head = ["Ngày", "Bắt đầu", "Kết thúc", "Thời gian", "Tỷ lệ đúng (%)", "Số cảnh báo", "Điểm TB"];
  const body = rows.map((r) => [
    new Date(r.startedAt).toLocaleDateString("vi-VN"),
    new Date(r.startedAt).toLocaleTimeString("vi-VN"),
    new Date(r.endedAt).toLocaleTimeString("vi-VN"),
    formatDuration(r.durationMs),
    Math.round(r.goodPostureRatio * 100),
    r.alertsCount,
    Math.round(r.avgScore),
  ]);
  return [head, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

function download(name: string, content: string, mime: string) {
  const blob = new Blob(["\ufeff" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function HistoryPage() {
  const sessions = useLiveQuery(async () => (await getDB().sessions.orderBy("startedAt").reverse().toArray()), [], []);
  const [q, setQ] = useState("");
  const [date, setDate] = useState("");

  const filtered = sessions.filter((s) => {
    if (date) {
      const d = new Date(s.startedAt).toISOString().slice(0, 10);
      if (d !== date) return false;
    }
    if (q) {
      const text = `${formatDate(s.startedAt)} ${s.alertsCount} ${Math.round(s.avgScore)}`.toLowerCase();
      if (!text.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const handleExportCSV = () => {
    download(`posealert-history-${Date.now()}.csv`, toCSV(filtered), "text/csv;charset=utf-8");
    toast.success("Đã xuất CSV");
  };

  const handleClear = async () => {
    if (!confirm("Xoá toàn bộ lịch sử?")) return;
    await getDB().sessions.clear();
    toast.success("Đã xoá");
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold">Lịch sử phiên học</h2>
              <p className="text-xs text-muted-foreground">Tổng cộng {sessions.length} phiên</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Tìm kiếm..."
                  className="bg-transparent text-sm outline-none w-40"
                />
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-white/5 rounded-lg px-3 py-1.5 text-sm outline-none"
              />
              <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 hover:bg-white/5">
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
              <button onClick={handleClear} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--neon-red)]/30 text-[var(--neon-red)] hover:bg-[var(--neon-red)]/10">
                <Trash2 className="w-3.5 h-3.5" /> Xoá tất cả
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-white/5">
                <tr>
                  <th className="text-left font-medium py-3 px-2">Ngày</th>
                  <th className="text-left font-medium py-3 px-2">Bắt đầu</th>
                  <th className="text-left font-medium py-3 px-2">Kết thúc</th>
                  <th className="text-left font-medium py-3 px-2">Thời gian</th>
                  <th className="text-right font-medium py-3 px-2">Tỷ lệ đúng</th>
                  <th className="text-right font-medium py-3 px-2">Cảnh báo</th>
                  <th className="text-right font-medium py-3 px-2">Điểm TB</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">Chưa có dữ liệu phiên học</td>
                  </tr>
                )}
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-3 px-2">{new Date(s.startedAt).toLocaleDateString("vi-VN")}</td>
                    <td className="py-3 px-2 text-muted-foreground">{new Date(s.startedAt).toLocaleTimeString("vi-VN")}</td>
                    <td className="py-3 px-2 text-muted-foreground">{new Date(s.endedAt).toLocaleTimeString("vi-VN")}</td>
                    <td className="py-3 px-2 font-mono">{formatDuration(s.durationMs)}</td>
                    <td className="py-3 px-2 text-right">
                      <span className="px-2 py-0.5 rounded-md text-xs"
                        style={{
                          background: s.goodPostureRatio > 0.7 ? "rgba(34,197,94,0.15)" : s.goodPostureRatio > 0.5 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)",
                          color: s.goodPostureRatio > 0.7 ? "#22c55e" : s.goodPostureRatio > 0.5 ? "#f59e0b" : "#ef4444",
                        }}>
                        {Math.round(s.goodPostureRatio * 100)}%
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right tabular-nums">{s.alertsCount}</td>
                    <td className="py-3 px-2 text-right tabular-nums font-medium">{Math.round(s.avgScore)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
