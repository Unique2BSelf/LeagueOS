'use client';

import { useState, useEffect } from 'react';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

interface AnalyticsData {
  eventCounts: { type: string; count: number }[];
  uniqueUsers: number;
  uniqueTeams: number;
  totalEvents: number;
}

interface AttendanceData {
  day: string;
  hour: number;
  count: number;
}

interface RevenueData {
  category: string;
  amount: number;
}

interface RetentionData {
  month: string;
  retention: number;
}

export default function AnalyticsDashboard() {
  const [overview, setOverview] = useState<AnalyticsData | null>(null);
  const [attendance, setAttendance] = useState<AttendanceData[]>([]);
  const [revenue, setRevenue] = useState<RevenueData[]>([]);
  const [retention, setRetention] = useState<RetentionData[]>([]);
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [overviewRes, attendanceRes, revenueRes, retentionRes] = await Promise.all([
        fetch(`/api/analytics?type=overview&period=${period}`),
        fetch(`/api/analytics?type=attendance&period=${period}`),
        fetch(`/api/analytics?type=revenue&period=${period}`),
        fetch(`/api/analytics?type=retention&period=${period}`),
      ]);

      setOverview(await overviewRes.json());
      setAttendance(await attendanceRes.json());
      setRevenue(await revenueRes.json());
      setRetention(await retentionRes.json());
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const maxAttendance = Math.max(...attendance.map(a => a.count), 1);
  const maxRevenue = Math.max(...revenue.map(r => r.amount), 1);
  const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);

  // Export functions
  const exportToCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}.csv`);
  };

  const exportToExcel = (data: any[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const handleAttendanceExport = () => exportToCSV(attendance, 'attendance-report');
  const handleRevenueExport = () => exportToExcel(revenue, 'revenue-report');
  const handleMembersExport = () => {
    const members = [
      { name: 'John Doe', team: 'FC United', matches: 12, goals: 8 },
      { name: 'Jane Smith', team: 'City Kickers', matches: 10, goals: 12 },
    ];
    exportToExcel(members, 'member-statistics');
  };
  const handleFullExport = () => {
    const data = [
      { section: 'Overview', ...overview },
      ...attendance.map(a => ({ section: 'Attendance', ...a })),
      ...revenue.map(r => ({ section: 'Revenue', ...r })),
      ...retention.map(r => ({ section: 'Retention', ...r })),
    ];
    exportToExcel(data, 'full-analytics');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">📊 Analytics Dashboard</h1>
            <p className="text-white/50 text-sm">League performance insights</p>
          </div>
          <div className="flex gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-white/10 text-white border border-white/20 rounded-lg px-3 py-2"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
            <button onClick={loadAnalytics} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg">
              🔄 Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Overview Cards */}
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <div className="text-white/50 text-sm mb-1">Total Events</div>
              <div className="text-3xl font-bold text-white">{overview?.totalEvents || 0}</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <div className="text-white/50 text-sm mb-1">Unique Users</div>
              <div className="text-3xl font-bold text-white">{overview?.uniqueUsers || 0}</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <div className="text-white/50 text-sm mb-1">Active Teams</div>
              <div className="text-3xl font-bold text-white">{overview?.uniqueTeams || 0}</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <div className="text-white/50 text-sm mb-1">Total Revenue</div>
              <div className="text-3xl font-bold text-green-400">${totalRevenue.toLocaleString()}</div>
            </div>
          </div>
        </section>

        {/* Event Types */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Event Breakdown</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {overview?.eventCounts.map(event => (
              <div key={event.type} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 text-center">
                <div className="text-2xl mb-1">
                  {event.type === 'match_attendance' ? '⚽' :
                   event.type === 'sub_request' ? '🔄' :
                   event.type === 'donation' ? '💝' :
                   event.type === 'registration' ? '📝' : '📊'}
                </div>
                <div className="text-white/70 text-sm capitalize">{event.type.replace('_', ' ')}</div>
                <div className="text-2xl font-bold text-white">{event.count}</div>
              </div>
            ))}
            {(!overview?.eventCounts || overview.eventCounts.length === 0) && (
              <div className="col-span-5 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-8 text-center text-white/50">
                No events recorded yet
              </div>
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Attendance Heatmap */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">📅 Attendance Heatmap</h2>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <div className="flex gap-1 mb-2">
                {['8a', '12p', '4p', '8p'].map(t => (
                  <div key={t} className="flex-1 text-center text-white/30 text-xs">{t}</div>
                ))}
              </div>
              <div className="space-y-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="flex gap-1">
                    <div className="w-10 text-white/50 text-xs flex items-center">{day}</div>
                    {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map(hour => {
                      const cell = attendance.find(a => a.day === day && a.hour === hour);
                      const intensity = cell ? cell.count / maxAttendance : 0;
                      return (
                        <div key={hour} className="flex-1 h-6 rounded-sm" style={{
                          backgroundColor: intensity > 0 ? `rgba(147, 51, 234, ${0.2 + intensity * 0.8})` : 'rgba(255,255,255,0.05)',
                        }} title={`${day} ${hour}:00 - ${cell?.count || 0}`} />
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-4">
                <span className="text-white/30 text-xs">Low</span>
                <div className="flex gap-1">
                  {[0.2, 0.4, 0.6, 0.8, 1].map(i => (
                    <div key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: `rgba(147, 51, 234, ${i})` }} />
                  ))}
                </div>
                <span className="text-white/30 text-xs">High</span>
              </div>
            </div>
          </section>

          {/* Revenue Breakdown */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">💰 Revenue Breakdown</h2>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <div className="space-y-4">
                {revenue.map((item, i) => (
                  <div key={item.category}>
                    <div className="flex justify-between text-white mb-1">
                      <span>{item.category}</span>
                      <span>${item.amount.toLocaleString()}</span>
                    </div>
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${(item.amount / maxRevenue) * 100}%`,
                        backgroundColor: ['#9333ea', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'][i % 5],
                      }} />
                    </div>
                  </div>
                ))}
                {revenue.length === 0 && <p className="text-white/50 text-center py-8">No revenue data</p>}
              </div>
            </div>
          </section>

          {/* Retention Curve */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">📈 Member Retention</h2>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <div className="h-48 flex items-end gap-2">
                {retention.map((item) => (
                  <div key={item.month} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t" style={{ height: `${item.retention}%` }} />
                    <div className="text-white/50 text-xs mt-2">{item.month}</div>
                    <div className="text-white text-sm font-medium">{item.retention}%</div>
                  </div>
                ))}
              </div>
              {retention.length === 0 && <p className="text-white/50 text-center py-8">No retention data</p>}
            </div>
          </section>

          {/* Export Options */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">📥 Export Reports</h2>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <div className="space-y-3">
                <button onClick={handleAttendanceExport} className="w-full bg-white/10 hover:bg-white/20 text-white py-3 px-4 rounded-lg flex items-center justify-between">
                  <span>📊 Attendance Report</span>
                  <span className="text-white/50">CSV</span>
                </button>
                <button onClick={handleRevenueExport} className="w-full bg-white/10 hover:bg-white/20 text-white py-3 px-4 rounded-lg flex items-center justify-between">
                  <span>💰 Revenue Report</span>
                  <span className="text-white/50">Excel</span>
                </button>
                <button onClick={handleMembersExport} className="w-full bg-white/10 hover:bg-white/20 text-white py-3 px-4 rounded-lg flex items-center justify-between">
                  <span>👥 Member Statistics</span>
                  <span className="text-white/50">Excel</span>
                </button>
                <button onClick={handleFullExport} className="w-full bg-white/10 hover:bg-white/20 text-white py-3 px-4 rounded-lg flex items-center justify-between">
                  <span>📈 Full Analytics</span>
                  <span className="text-white/50">Excel</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
