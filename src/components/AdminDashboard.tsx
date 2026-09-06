import React, { useState, useEffect } from 'react';
import { User } from '../lib/firebase';
import { AdminAggregateResponse } from '../types';
import { formatErrorMessage } from '../lib/sanitizer';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  BookOpen,
  Terminal,
  BarChart3,
  RefreshCw,
  Lock,
  ArrowLeft,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface AdminDashboardProps {
  user: User | null;
  onBackToJournal: () => void;
  onRefreshRole?: () => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  onBackToJournal,
  onRefreshRole,
}) => {
  const [data, setData] = useState<AdminAggregateResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorInfo, setErrorInfo] = useState<{
    message: string;
    status?: number;
    code?: string;
  } | null>(null);
  const [isForbidden, setIsForbidden] = useState<boolean>(false);

  const fetchMetrics = async () => {
    if (!user) {
      setIsForbidden(true);
      setErrorInfo({
        message: 'Authentication required. Please sign in with a verified account.',
        status: 401,
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorInfo(null);
    setIsForbidden(false);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/admin/aggregate-metrics', {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const json = await res.json();

      if (res.status === 403) {
        setIsForbidden(true);
        setErrorInfo({
          message: formatErrorMessage(json.error, 'Forbidden: Admin custom claim required.'),
          status: 403,
          code: json.code || 'INSUFFICIENT_PERMISSIONS',
        });
        return;
      }

      if (!res.ok) {
        setErrorInfo({
          message: formatErrorMessage(json.error, `Server responded with HTTP ${res.status}`),
          status: res.status,
          code: json.code,
        });
        return;
      }

      setData(json);
    } catch (err: any) {
      console.error('Failed to load admin metrics:', err);
      setErrorInfo({
        message: formatErrorMessage(err, 'Network error while contacting aggregate metrics endpoint.'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [user]);

  // Clean 403 Forbidden View (Never crash for non-admins)
  if (isForbidden) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={onBackToJournal}
            className="inline-flex items-center gap-2 text-xs font-medium text-stone-600 hover:text-stone-900 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Journal</span>
          </button>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
              <Lock className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-stone-900">403 Forbidden — Admin Custom Claims Required</h1>
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                  Access Denied
                </span>
              </div>
              <p className="mt-2 text-sm text-stone-600 leading-relaxed">
                Your authenticated account <span className="font-mono font-medium text-stone-800">{user?.email}</span>{' '}
                does not currently possess the verified Firebase custom claim <code className="rounded bg-stone-100 px-1 py-0.5 text-xs font-mono text-stone-800">role === 'admin'</code>.
              </p>

              <div className="mt-6 rounded-xl border border-stone-200 bg-stone-50 p-4">
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-700">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Zero-Trust RBAC Architecture</span>
                </h2>
                <ul className="mt-2 space-y-1.5 text-xs text-stone-600">
                  <li>• Client-side role claims are strictly cosmetic — the server cryptographically validates Firebase ID tokens.</li>
                  <li>• Attempting to supply <code className="bg-white px-1 font-mono">?role=admin</code> in query parameters is actively detected and blocked.</li>
                  <li>• Even with verified admin privileges, database rules prevent reading any user's personal journal content.</li>
                </ul>
              </div>

              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                <h2 className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <Terminal className="h-4 w-4 text-amber-700" />
                  <span>How to Provision Admin Role on This Account</span>
                </h2>
                <p className="mt-1.5 text-xs text-amber-800">
                  Run the dedicated Admin SDK provisioner from your terminal:
                </p>
                <div className="mt-2 rounded-lg bg-stone-900 p-3 font-mono text-xs text-amber-300 select-all overflow-x-auto">
                  node scripts/set-admin.js {user?.email || 'your-account@gmail.com'}
                </div>
                <p className="mt-2 text-[11px] text-amber-800/80">
                  After running the script, refresh your token by clicking the button below or signing out and back in.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={async () => {
                    if (onRefreshRole) await onRefreshRole();
                    await fetchMetrics();
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-stone-800 active:scale-95 transition"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Re-check Permissions</span>
                </button>
                <button
                  onClick={onBackToJournal}
                  className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 active:scale-95 transition"
                >
                  <span>Back to Journal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // General Loading View
  if (isLoading && !data) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-900 border-t-transparent mb-3" />
          <p className="text-xs font-medium text-stone-600">
            Evaluating server-side collection group counts via Admin SDK...
          </p>
          <p className="text-[11px] text-stone-400 mt-1">Zero content read guarantee active</p>
        </div>
      </div>
    );
  }

  // Real Error View (Honest status reporting, no fake number fallbacks)
  if (errorInfo && !data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <button
            onClick={onBackToJournal}
            className="inline-flex items-center gap-2 text-xs font-medium text-stone-600 hover:text-stone-900 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Journal</span>
          </button>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h1 className="text-base font-semibold text-red-900">
                Admin Aggregation Query Failed {errorInfo.status ? `(HTTP ${errorInfo.status})` : ''}
              </h1>
              <p className="mt-1 text-xs text-red-700 font-mono break-all">{errorInfo.message}</p>
              {errorInfo.code && (
                <span className="mt-2 inline-block rounded bg-red-100 px-2 py-0.5 text-[10px] font-mono font-medium text-red-800">
                  CODE: {errorInfo.code}
                </span>
              )}
              <p className="mt-4 text-xs text-red-600">
                In accordance with system specifications, fake metrics are strictly prohibited. The system surfaces real server status instead of synthetic placeholders.
              </p>
              <div className="mt-4">
                <button
                  onClick={fetchMetrics}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-800 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-red-900 transition active:scale-95"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Retry Aggregation</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const metrics = data?.aggregateMetrics;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Header & Navigation */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            onClick={onBackToJournal}
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-900 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Personal Journal</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">Admin Governance Dashboard</h1>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              Verified Admin
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Real-time server-side aggregation powered by Firestore collection group counters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMetrics}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-2xs hover:bg-stone-50 active:scale-95 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Metrics</span>
          </button>
        </div>
      </div>

      {/* Top Guarantee Banner */}
      <div className="mb-6 rounded-xl border border-stone-200 bg-stone-50/80 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-stone-700">
            <span className="font-semibold text-stone-900">Zero Content Read Guarantee: </span>
            {data?.securityGuarantee ||
              'Admin access is restricted to aggregate metadata only via .count() and .select() operations. No admin path may read another user’s entry content.'}
            <div className="mt-1 text-[11px] text-stone-400 font-mono">
              Calculated at: {metrics?.calculatedAt ? new Date(metrics.calculatedAt).toLocaleString() : 'Just now'} • Verified via: {data?.roleVerifiedVia}
            </div>
          </div>
        </div>
      </div>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {/* Total Users */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Total Users</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-stone-900">
              {metrics?.totalUsers ?? 0}
            </span>
            <p className="mt-1 text-[11px] text-stone-400">Total registered accounts</p>
          </div>
        </div>

        {/* Total Interactions */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Total Interactions</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-stone-900">
              {metrics?.totalInteractions ?? 0}
            </span>
            <p className="mt-1 text-[11px] text-stone-400">CollectionGroup count system-wide</p>
          </div>
        </div>

        {/* Flagged Interactions */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Flagged Interactions</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-amber-700">
              {metrics?.flaggedInteractions ?? 0}
            </span>
            <p className="mt-1 text-[11px] text-stone-400">Preserved in vault, isolated from AI</p>
          </div>
        </div>

        {/* Security Audit Events */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Security Events</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-white">
              <Terminal className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-stone-900">
              {metrics?.totalSecurityEvents ?? 0}
            </span>
            <p className="mt-1 text-[11px] text-stone-400">Top-level security_events count</p>
          </div>
        </div>
      </div>

      {/* Mode Distribution & System Metadata */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Mode Distribution */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-stone-700" />
              <h2 className="text-sm font-semibold text-stone-900">Reflection Mode Distribution</h2>
            </div>
            <span className="text-[11px] text-stone-400">Metadata select only</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-medium text-stone-700 mb-1">
                <span>Reflect ({metrics?.modeCounts?.reflect ?? 0})</span>
                <span>{metrics?.modeDistribution?.reflect ?? '0%'}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-stone-100 overflow-hidden">
                <div
                  className="h-full bg-amber-700 transition-all duration-500"
                  style={{ width: metrics?.modeDistribution?.reflect || '0%' }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-stone-700 mb-1">
                <span>Summarize ({metrics?.modeCounts?.summarize ?? 0})</span>
                <span>{metrics?.modeDistribution?.summarize ?? '0%'}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-stone-100 overflow-hidden">
                <div
                  className="h-full bg-stone-800 transition-all duration-500"
                  style={{ width: metrics?.modeDistribution?.summarize || '0%' }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-stone-700 mb-1">
                <span>Brainstorm ({metrics?.modeCounts?.brainstorm ?? 0})</span>
                <span>{metrics?.modeDistribution?.brainstorm ?? '0%'}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-stone-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-500"
                  style={{ width: metrics?.modeDistribution?.brainstorm || '0%' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Security Rule Verifications */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-stone-700" />
            <h2 className="text-sm font-semibold text-stone-900">Cryptographic Rules &amp; RBAC Boundary</h2>
          </div>

          <div className="space-y-3 text-xs text-stone-600">
            <div className="rounded-lg bg-stone-50 p-3 border border-stone-200">
              <span className="font-semibold text-stone-800 block">firestore.rules isolation:</span>
              <p className="mt-0.5 text-stone-600">
                The Firestore security rules explicitly restrict access to <code className="font-mono text-[11px] bg-white px-1">/users/{'{userId}'}/interactions/*</code> with <code className="font-mono text-[11px] bg-white px-1">request.auth.uid == userId</code>. There is no admin bypass.
              </p>
            </div>

            <div className="rounded-lg bg-stone-50 p-3 border border-stone-200">
              <span className="font-semibold text-stone-800 block">Server-Side Admin SDK Pipeline:</span>
              <p className="mt-0.5 text-stone-600">
                Aggregation runs exclusively via <code className="font-mono text-[11px] bg-white px-1">collectionGroup('interactions').count()</code>. Document content, responses, and message bodies are never read into memory.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
