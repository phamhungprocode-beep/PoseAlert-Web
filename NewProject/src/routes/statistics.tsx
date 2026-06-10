import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useLiveQuery } from "@/hooks/useLiveQuery";
import { getDB } from "@/database/db";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

export const Route = createFileRoute("/statistics")({
  head: () => ({ meta: [{ title: "Thống kê · PoseAlertAI" }] }),
  component: StatsPage,
});

function dayKey(ts: number) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
function fmtDate(ts: number) { return new Date(ts).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }); }

function StatsPage() {
  const sessions = useLiveQuery(async () => (await getDB().sessions.orderBy("startedAt").toArray()), [], []);
  const alerts = useLiveQuery(async () => (await getDB().alerts.orderBy("at").toArray()), [], []);

  // Group by day (last 14 days)
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dailyData = Array.from({ length: 14 }).map((_, i) => {
    const day = today.getTime() - (13 - i) * 86400000;
    const dayEnd = day + 86400000;
    const ds = sessions.filter((s) => s.startedAt >= day && s.startedAt < dayEnd);
    const minutes = Math.round(ds.reduce((a, b) => a + b.durationMs, 0) / 60000);
    const ratio = ds.length ? Math.round((ds.reduce((a, b) => a + b.goodPostureRatio, 0) / ds.length) * 100) : 0;
    const alertsCount = ds.reduce((a, b) => a + b.alertsCount, 0);
    return { day: fmtDate(day), minutes, ratio, alerts: alertsCount };
  });

  // Weekly: last 8 weeks
  const weeklyData = Array.from({ length: 8 }).map((_, i) => {
    const start = today.getTime() - (7 - i) * 7 * 86400000;
    const end = start + 7 * 86400000;
    const ds = sessions.filter((s) => s.startedAt >= start && s.startedAt < end);
    return {
      week: `T${8 - i}`,
      hours: +(ds.reduce((a, b) => a + b.durationMs, 0) / 3600000).toFixed(1),
      alerts: ds.reduce((a, b) => a + b.alertsCount, 0),
    };
  });

  // Alert type distribution
  const types = ["back", "neck", "shoulders", "distance", "longSit"] as const;
  const COLORS = ["#2563eb", "#06b6d4", "#7c3aed", "#f59e0b", "#ef4444"];
  const pieData = types.map((t) => ({ name: t, value: alerts.filter((a) => a.type === t).length }));

  // Monthly trend (improvement)
  const monthlyData = Array.from({ length: 6 }).map((_, i) => {
    const m = new Date(); m.setDate(1); m.setHours(0, 0, 0, 0);
    m.setMonth(m.getMonth() - (5 - i));
    const start = m.getTime();
    const next = new Date(m); next.setMonth(next.getMonth() + 1);
    const ds = sessions.filter((s) => s.startedAt >= start && s.startedAt < next.getTime());
    return {
      month: m.toLocaleDateString("vi-VN", { month: "2-digit", year: "2-digit" }),
      avgScore: ds.length ? Math.round(ds.reduce((a, b) => a + b.avgScore, 0) / ds.length) : 0,
    };
  });

  const tooltipStyle = {
    background: "rgba(17,24,39,0.95)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    fontSize: 12,
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Thống kê chuyên sâu</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Theo dõi xu hướng cải thiện tư thế theo thời gian</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-4">Thời gian học (14 ngày)</h3>
            <div className="h-[260px]">
              <ResponsiveContainer>
                <AreaChart data={dailyData} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mins" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area dataKey="minutes" stroke="#06b6d4" strokeWidth={2.5} fill="url(#mins)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-4">Tỷ lệ tư thế đúng (%)</h3>
            <div className="h-[260px]">
              <ResponsiveContainer>
                <LineChart data={dailyData} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line dataKey="ratio" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-4">Tổng giờ học theo tuần</h3>
            <div className="h-[260px]">
              <ResponsiveContainer>
                <BarChart data={weeklyData} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="week" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="hours" fill="#2563eb" radius={[6, 6, 0, 0]} name="Giờ học" />
                  <Bar dataKey="alerts" fill="#ef4444" radius={[6, 6, 0, 0]} name="Cảnh báo" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-4">Phân loại cảnh báo</h3>
            <div className="h-[260px]">
              <ResponsiveContainer>
                <PieChart>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Pie data={pieData} dataKey="value" innerRadius={60} outerRadius={95} paddingAngle={3}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold mb-4">Xu hướng cải thiện điểm tư thế (6 tháng)</h3>
            <div className="h-[260px]">
              <ResponsiveContainer>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="trend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area dataKey="avgScore" stroke="#7c3aed" strokeWidth={2.5} fill="url(#trend)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
