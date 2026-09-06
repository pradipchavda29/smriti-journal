import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Sparkles,
  BookOpen,
  Calendar,
  Flame,
  Activity,
  ArrowRight,
  Mail,
  RefreshCw,
  AlertCircle,
  CalendarPlus,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import { DashboardSummaryResponse, DashboardActionItem } from '../types';

interface DashboardViewProps {
  user: User;
  onNewEntry: () => void;
  onSelectTheme?: (themeLabel: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  onNewEntry,
  onSelectTheme,
}) => {
  const [data, setData] = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadedActionId, setDownloadedActionId] = useState<string | null>(null);

  const fetchDashboard = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/dashboard/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to fetch dashboard (${res.status})`);
      }

      const summary: DashboardSummaryResponse = await res.json();
      setData(summary);
    } catch (err: any) {
      console.error('Failed to load dashboard summary:', err);
      setError(err?.message || 'Unable to generate dashboard summary.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [user.uid]);

  // Client-side iCalendar (.ics) export for action items
  const handleExportIcs = (item: DashboardActionItem, idx: number) => {
    const actionKey = `${item.title}-${idx}`;
    const dateClean = (item.suggestedDate || '').replace(/[^0-9]/g, '');
    const now = new Date();
    const dtStamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const uid = `smriti-action-${Date.now()}-${idx}@reflectai.journal`;

    let dtStart = '';
    let dtEnd = '';

    if (dateClean.length === 8) {
      dtStart = `DTSTART;VALUE=DATE:${dateClean}`;
      const d = new Date(item.suggestedDate);
      d.setDate(d.getDate() + 1);
      const endParts = d.toISOString().split('T')[0].replace(/-/g, '');
      dtEnd = `DTEND;VALUE=DATE:${endParts}`;
    } else {
      dtStart = `DTSTART:${dtStamp}`;
      dtEnd = `DTEND:${dtStamp}`;
    }

    const cleanSummary = (item.title || 'Journal Action Item')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');

    const cleanDesc = (item.description || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Smriti Journal//Action Item//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      dtStart,
      dtEnd,
      `SUMMARY:${cleanSummary}`,
      `DESCRIPTION:${cleanDesc}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = (item.title || 'action-item')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 30);
    link.download = `${safeTitle || 'action-item'}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadedActionId(actionKey);
    setTimeout(() => setDownloadedActionId(null), 3000);
  };

  // Client-side mailto URL builder
  const buildMailtoUrl = (item: DashboardActionItem) => {
    const subject = encodeURIComponent(`Journal Follow-up: ${item.title}`);
    const body = encodeURIComponent(
      `Action Item: ${item.title}\n` +
      (item.suggestedDate ? `Target Date: ${item.suggestedDate}\n\n` : '\n') +
      `Details:\n${item.description}\n\n` +
      `— Inferred from reflections in Smriti Journal`
    );
    return `mailto:?subject=${subject}&body=${body}`;
  };

  // Render inline SVG sparkline for 14-day history
  const renderSparkline = (pointsData: number[]) => {
    const width = 160;
    const height = 36;
    const paddingX = 6;
    const paddingY = 6;
    const max = Math.max(...pointsData, 1);

    const coords = pointsData.map((val, idx) => {
      const x = paddingX + (idx / 13) * (width - 2 * paddingX);
      const y = height - paddingY - (val / max) * (height - 2 * paddingY);
      return { x, y, val };
    });

    const linePath = coords.reduce(
      (acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`,
      ''
    );

    const areaPath = `${linePath} L ${coords[13].x.toFixed(1)} ${height} L ${coords[0].x.toFixed(1)} ${height} Z`;

    return (
      <svg
        className="w-full h-9 overflow-visible"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        aria-label="14-day reflection activity sparkline"
      >
        <path d={areaPath} className="fill-amber-500/15" />
        <path
          d={linePath}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-amber-800"
        />
        {coords.map((pt, i) =>
          pt.val > 0 ? (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r="2"
              className="fill-amber-900 stroke-white stroke-[1.5]"
            />
          ) : null
        )}
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-amber-800 border-t-transparent mb-4" />
        <h3 className="text-sm font-semibold text-stone-900">Synthesizing Reflection Dashboard</h3>
        <p className="text-xs text-stone-500 max-w-sm mt-1">
          Analyzing your writing streaks, recurring themes, and personal trajectory...
        </p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="rounded-xl border border-red-200 bg-red-50/70 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-red-900">Unable to load dashboard</h3>
          <p className="text-xs text-red-700 mt-1 mb-4">{error}</p>
          <button
            onClick={() => fetchDashboard(false)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-800 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-red-700 active:scale-95 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  // Warm empty state when user has zero entries
  if (!data || data.totalEntries === 0 || data.empty) {
    return (
      <div className="p-6 sm:p-10 max-w-2xl mx-auto my-auto text-center">
        <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-8 sm:p-12 shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100/80 text-amber-800 mb-5">
            <BookOpen className="h-7 w-7" />
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">
            Your Reflection Dashboard
          </h2>
          <p className="mt-3 text-sm text-stone-600 leading-relaxed max-w-md mx-auto">
            This space illuminates your journey as you journal — synthesizing recurring themes, emotional arcs, writing habits, and actionable follow-ups over time.
          </p>
          <div className="mt-8 flex justify-center">
            <button
              id="dashboard-first-entry-btn"
              onClick={onNewEntry}
              className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-stone-800 active:scale-95 transition"
            >
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>Write your first reflection</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-stone-900 tracking-tight">
            Reflection Dashboard
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Synthesized insights, recurring themes, and personal trends from your private journal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="dashboard-refresh-btn"
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-2xs hover:bg-stone-50 active:scale-95 transition disabled:opacity-50"
            title="Refresh summary"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-amber-700' : 'text-stone-500'}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Hero Card: AI Narrative with Model Name */}
      <section
        id="dashboard-hero-card"
        className="rounded-2xl border border-amber-900/15 bg-gradient-to-br from-amber-50/70 via-stone-50/50 to-white p-6 shadow-xs relative overflow-hidden"
      >
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-800 text-amber-100 shadow-2xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold text-stone-900">Personal Narrative Synthesis</h2>
          </div>
          <div className="flex items-center gap-2">
            {data.aiAvailable ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-800/20 bg-amber-100/60 px-2.5 py-0.5 text-[11px] font-medium text-amber-900">
                <span>Model:</span>
                <span className="font-mono text-[10px]">{data.modelUsed || 'gemini-3.6-flash'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-stone-300 bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-600">
                <span>AI Insights Offline</span>
              </span>
            )}
          </div>
        </div>

        <p className="text-sm sm:text-base text-stone-800 leading-relaxed font-serif italic">
          "{data.narrative}"
        </p>

        {!data.aiAvailable && (
          <p className="mt-3 text-[11px] text-stone-500 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-amber-700 shrink-0" />
            <span>Showing locally computed statistics. Gemini synthesis will automatically resume on next refresh.</span>
          </p>
        )}
      </section>

      {/* Stat Row: Total Entries, 7-Day Count, Streak, 14-Day Sparkline */}
      <section id="dashboard-stat-row" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Reflections */}
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-stone-400">Total Entries</span>
            <BookOpen className="h-4 w-4 text-stone-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-stone-900">{data.totalEntries}</span>
            <span className="text-xs text-stone-500">reflections</span>
          </div>
          <div className="mt-2 text-[11px] text-stone-500">
            {data.entriesLast30Days} in the last 30 days
          </div>
        </div>

        {/* 7-Day Count */}
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-stone-400">Past 7 Days</span>
            <Calendar className="h-4 w-4 text-stone-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-stone-900">{data.entriesLast7Days}</span>
            <span className="text-xs text-stone-500">this week</span>
          </div>
          <div className="mt-2 text-[11px] text-stone-500">
            {data.entriesLast7Days > 0 ? 'Active journaling momentum' : 'Ready for your next entry'}
          </div>
        </div>

        {/* Current Writing Streak */}
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-stone-400">Current Streak</span>
            <Flame className={`h-4 w-4 ${data.currentStreak > 0 ? 'text-amber-700' : 'text-stone-400'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-stone-900">{data.currentStreak}</span>
            <span className="text-xs text-stone-500">{data.currentStreak === 1 ? 'day' : 'days'}</span>
          </div>
          <div className="mt-2 text-[11px] text-stone-500">
            {data.currentStreak > 0 ? 'Consecutive daily entries' : 'Write today to build a streak'}
          </div>
        </div>

        {/* 14-Day Activity Sparkline */}
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-xs font-medium uppercase tracking-wider text-stone-400">14-Day Velocity</span>
              <Activity className="h-4 w-4 text-stone-400" />
            </div>
            <div className="py-1">
              {renderSparkline(data.sparkline14Days || new Array(14).fill(0))}
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1 border-t border-stone-100">
            <span>14d ago</span>
            <span>Today</span>
          </div>
        </div>
      </section>

      {/* Mood Arc Line */}
      {data.moodArc && (
        <section
          id="dashboard-mood-arc"
          className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 shadow-2xs flex items-start gap-3"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-200/80 text-stone-700">
            <Activity className="h-4 w-4 text-amber-800" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Emotional Trajectory
            </div>
            <p className="text-xs sm:text-sm text-stone-800 mt-0.5 leading-relaxed">
              {data.moodArc}
            </p>
          </div>
        </section>
      )}

      {/* Theme Chips: Clicking runs Ask Past Self */}
      {data.themes && data.themes.length > 0 && (
        <section id="dashboard-themes-section" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-900">Recurring Themes</h3>
            <span className="text-[11px] text-stone-500">
              Click a theme to query your past reflections
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.themes.map((theme, idx) => (
              <button
                key={idx}
                id={`theme-chip-${idx}`}
                onClick={() => onSelectTheme && onSelectTheme(theme.label)}
                className="group flex flex-col items-start text-left rounded-xl border border-stone-200 bg-white p-3.5 shadow-2xs hover:border-amber-700 hover:bg-amber-50/30 active:scale-[0.99] transition"
                title={`Ask Past Self: "${theme.label}"`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-bold text-stone-900 group-hover:text-amber-900 transition">
                    {theme.label}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-amber-800 font-medium opacity-70 group-hover:opacity-100 transition">
                    <Compass className="h-3 w-3 text-amber-700" />
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
                <p className="text-xs text-stone-500 leading-snug line-clamp-2">
                  {theme.description}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Inferred Action Items */}
      {data.actionItems && data.actionItems.length > 0 && (
        <section id="dashboard-action-items-section" className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-900">Inferred Action Items</h3>
            <span className="text-[11px] text-stone-500">
              Follow-ups derived directly from your entries
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.actionItems.map((item, idx) => {
              const actionKey = `${item.title}-${idx}`;
              const isDownloaded = downloadedActionId === actionKey;

              return (
                <div
                  key={idx}
                  id={`action-item-card-${idx}`}
                  className="flex flex-col justify-between rounded-xl border border-stone-200 bg-white p-4 shadow-2xs hover:border-stone-300 transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="text-sm font-semibold text-stone-900 leading-snug">
                        {item.title}
                      </h4>
                      {item.suggestedDate && (
                        <span className="inline-flex items-center gap-1 shrink-0 rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                          <Calendar className="h-3 w-3 text-stone-400" />
                          <span>{item.suggestedDate}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Two export buttons: Add to Calendar and Email this */}
                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                    <a
                      id={`action-email-btn-${idx}`}
                      href={buildMailtoUrl(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 shadow-2xs hover:bg-stone-50 active:scale-95 transition"
                      title="Compose email with this action item"
                    >
                      <Mail className="h-3.5 w-3.5 text-stone-500" />
                      <span>Email this</span>
                    </a>

                    <button
                      id={`action-calendar-btn-${idx}`}
                      onClick={() => handleExportIcs(item, idx)}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition active:scale-95 ${
                        isDownloaded
                          ? 'bg-emerald-700 text-white'
                          : 'border border-amber-800/30 bg-amber-50 text-amber-900 hover:bg-amber-100/70'
                      }`}
                      title="Download .ics calendar event file"
                    >
                      {isDownloaded ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <CalendarPlus className="h-3.5 w-3.5 text-amber-800" />
                          <span>Add to Calendar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Mode Distribution Footer Info */}
      {data.modeDistribution && (
        <div className="pt-2 flex flex-wrap items-center justify-between text-[11px] text-stone-400 border-t border-stone-100 gap-2">
          <div className="flex items-center gap-3">
            <span>Modes:</span>
            <span>Reflect: <strong className="font-semibold text-stone-600">{data.modeDistribution.reflect}</strong></span>
            <span>Summarize: <strong className="font-semibold text-stone-600">{data.modeDistribution.summarize}</strong></span>
            <span>Brainstorm: <strong className="font-semibold text-stone-600">{data.modeDistribution.brainstorm}</strong></span>
          </div>
          <div className="text-stone-400">
            Smriti Reflective Journal
          </div>
        </div>
      )}
    </div>
  );
};
