// Admin Dashboard - restricted to ADMIN_EMAIL (see RequireAdmin.jsx and
// backend/src/middleware/requireAdmin.js). This is a tool for Vaultrix's
// own operator, not part of the regular product surface, so unlike every
// other page in this app it does NOT go through the i18n t() system -
// hardcoding English here avoids maintaining ~100 translation keys across
// 6 locales for a page exactly one person will ever see. If that stops
// being true, this should be revisited.
//
// Visual language: light, matching the rest of the app's own palette
// (bg-white / bg-surface / border-border / text-ink / text-muted) for the
// same reason the rest of the product uses it - black text on a white
// surface reads better than light text on dark. The one typographic
// twist is font-mono (JetBrains Mono, see tailwind.config.js) on stat
// numbers and section eyebrows, for a bit of a dashboard/technical feel
// without sacrificing legibility anywhere body copy actually lives.
// Motion (Framer Motion) carries the "alive" feel instead of color.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  KeyRound,
  Laptop,
  LayoutDashboard,
  Loader2,
  Lock,
  RefreshCw,
  ScrollText,
  Search,
  ShieldAlert,
  ShieldOff,
  Trash2,
  Users as UsersIcon,
  X,
} from 'lucide-react';
import AppShell from '../components/layout/AppShell.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import Button from '../components/Button.jsx';
import FormField from '../components/FormField.jsx';
import { notify } from '../i18n/notifications.js';
import {
  getAdminOverview,
  listAdminUsers,
  getAdminUserDetail,
  updateAdminUser,
  deactivateAdminUser,
  reactivateAdminUser,
  deleteAdminUser,
  forceAdminPasswordReset,
  disableAdminUserMfa,
  revokeAdminUserSession,
  getAdminAuditLog,
  getAdminSecurityOverview,
  unlockAdminUser,
  exportAdminUsersCsv,
} from '../services/adminService.js';

const formatDateTime = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return '—';
  }
};

// Admin-only tool, not localized (see the file header comment) - the
// backend's own plain-English message is shown as-is, same as every
// English-language message this controller already sends.
const onError = (error) => notify.error(error?.message || 'Something went wrong.');

// --- Live polling -----------------------------------------------------------
// The brief was "updates without me refreshing, basically instantly". A
// literal 1-second poll per open tab, across overview + users + audit log +
// an open user panel, would run the admin account up against its own
// adminLimiter (300 requests / 5 minutes - see rateLimiters.js) with just
// ONE tab open. 2.5s keeps every section feeling live while staying well
// under that ceiling even with several sections' timers running at once,
// and it pauses entirely while the tab isn't visible so it isn't burning
// requests in a background tab either.
const LIVE_INTERVAL_MS = 2500;

function usePolling(callback, { enabled = true, intervalMs = LIVE_INTERVAL_MS } = {}) {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    let timer = null;

    const schedule = () => {
      if (cancelled) return;
      timer = setTimeout(tick, intervalMs);
    };

    const tick = async () => {
      if (cancelled) return;
      if (document.hidden) {
        schedule();
        return;
      }
      try {
        await callbackRef.current();
      } catch {
        // onError already handled inside the callback; a poll failing
        // once shouldn't stop future polls.
      }
      schedule();
    };

    const onVisibility = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        tick();
      }
    };

    schedule();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs]);
}

function LiveDot() {
  return (
    <span className="relative flex h-1.5 w-1.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
    </span>
  );
}

// --- Shared bits -------------------------------------------------------------

function Pill({ tone = 'neutral', children }) {
  const tones = {
    neutral: 'bg-black/5 text-ink',
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

function SectionCard({ title, subtitle, children, actions, icon: Icon }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-white">
      <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-4">
        <div className="flex items-center gap-2.5">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-accent" />}
          <div>
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
        </div>
        {actions}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-3">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-ink disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="font-mono text-xs text-muted">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-ink disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// A plain CSS bar chart, no charting library - 14 flexed bars whose height
// is a percentage of the biggest day in the series. Framer Motion animates
// each bar growing in on load/update instead of just snapping to height.
function SignupTrendChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex h-24 items-end gap-1.5">
      {data.map((d, i) => (
        <motion.div
          key={d.date}
          initial={{ height: 0 }}
          animate={{ height: `${Math.max((d.count / max) * 100, d.count > 0 ? 6 : 2)}%` }}
          transition={{ delay: i * 0.02, duration: 0.4, ease: 'easeOut' }}
          title={`${d.date}: ${d.count} signup${d.count === 1 ? '' : 's'}`}
          className="group relative flex-1 rounded-t bg-ink/15 transition-colors hover:bg-ink/30"
        >
          <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-muted opacity-0 transition-opacity group-hover:opacity-100">
            {d.count}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

// A thin stacked bar instead of a pie - reads fine at small sizes and
// doesn't need an SVG arc library to draw.
function BreakdownBar({ segments }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-black/5">
        {segments.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ width: 0 }}
            animate={{ width: `${(s.value / total) * 100}%` }}
            transition={{ delay: i * 0.08, duration: 0.5, ease: 'easeOut' }}
            style={{ backgroundColor: s.color }}
          />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-xs text-muted">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label} <span className="font-mono text-ink">{s.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// --- Overview -------------------------------------------------------------

function OverviewSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (silent) => {
    if (!silent) setLoading(true);
    try {
      const result = await getAdminOverview();
      setData(result);
    } catch (error) {
      if (!silent) onError(error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  usePolling(() => load(true));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (!data) return null;

  const stats = [
    { label: 'Total users', value: data.overview.totalUsers },
    { label: 'Active', value: data.overview.activeUsers },
    { label: 'Deactivated', value: data.overview.deactivatedUsers },
    { label: 'Locked out', value: data.overview.lockedUsers },
    { label: 'Online now', value: data.overview.onlineNow, live: true },
    { label: 'Signups today', value: data.overview.signupsToday },
    { label: 'Signups this week', value: data.overview.signupsThisWeek },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
            whileHover={{ y: -2 }}
            className="rounded-xl border border-border bg-white px-4 py-3.5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-1.5">
              <AnimatePresence mode="popLayout">
                <motion.p
                  key={stat.value}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-mono text-2xl font-bold tabular-nums text-ink"
                >
                  {stat.value}
                </motion.p>
              </AnimatePresence>
              {stat.live && <LiveDot />}
            </div>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard title="Signups, last 14 days">
            <SignupTrendChart data={data.signupTrend} />
          </SectionCard>
        </div>
        <div className="flex flex-col gap-4">
          <SectionCard title="Sign-in method">
            <BreakdownBar
              segments={[
                { label: 'Password', value: data.providerBreakdown.password, color: '#111114' },
                { label: 'Google', value: data.providerBreakdown.google, color: '#4285F4' },
              ]}
            />
          </SectionCard>
          <SectionCard title="Plan">
            <BreakdownBar
              segments={[
                { label: 'Standard', value: data.planBreakdown.standard, color: '#9ca3af' },
                { label: 'Premium', value: data.planBreakdown.premium, color: '#d97706' },
              ]}
            />
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Recent signups" icon={UsersIcon}>
        {data.recentSignups.length === 0 ? (
          <p className="text-sm text-muted">No signups yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            <AnimatePresence initial={false}>
              {data.recentSignups.map((u) => (
                <motion.li
                  key={u.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{u.name}</p>
                    <p className="truncate text-xs text-muted">{u.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Pill>{u.authProvider === 'google' ? 'Google' : 'Password'}</Pill>
                    <span className="font-mono text-xs text-muted">{formatDateTime(u.createdAt)}</span>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

// --- User detail panel -------------------------------------------------------------

function UserDetailPanel({ userId, onClose, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', country: '', currency: '', language: '', onboardingCompleted: false, adminNotes: '' });

  const load = useCallback(
    async (silent) => {
      if (!silent) setLoading(true);
      try {
        const data = await getAdminUserDetail(userId);
        setDetail(data);
        if (!editing) {
          setForm({
            name: data.user.name || '',
            email: data.user.email || '',
            country: data.user.country || '',
            currency: data.user.currency || '',
            language: data.user.language || '',
            onboardingCompleted: Boolean(data.user.onboardingCompleted),
            adminNotes: data.user.adminNotes || '',
          });
        }
      } catch (error) {
        if (!silent) {
          onError(error);
          onClose();
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, editing]
  );

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Paused while the admin is mid-edit so a live refresh can't clobber
  // what they're typing out from under them.
  usePolling(() => load(true), { enabled: !editing });

  const run = async (key, action, confirmMessage) => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBusy(key);
    try {
      await action();
      notify.success('Done.');
      await load(false);
      onChanged?.();
    } catch (error) {
      onError(error);
    } finally {
      setBusy(null);
    }
  };

  const saveEdits = async (event) => {
    event.preventDefault();
    if (form.email !== detail.user.email) {
      const ok = window.confirm(
        `Change this account's email to ${form.email}? This bypasses their own verification step - they will be notified at their old address.`
      );
      if (!ok) return;
    }
    setBusy('save');
    try {
      await updateAdminUser(userId, form);
      notify.success('Updated.');
      setEditing(false);
      await load(false);
      onChanged?.();
    } catch (error) {
      onError(error);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ x: 32, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 32, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-border bg-white"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-ink">User detail</h2>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading || !detail ? (
          <div className="flex flex-1 items-center justify-center text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-6 p-6">
            <div className="flex items-center gap-3">
              {detail.user.avatarUrl ? (
                <img src={detail.user.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-sm font-medium text-white">
                  {(detail.user.name || '?').slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{detail.user.name}</p>
                <p className="truncate text-xs text-muted">{detail.user.email}</p>
              </div>
              <div className="ms-auto flex flex-col items-end gap-1">
                <Pill tone={detail.user.isActive ? 'green' : 'red'}>{detail.user.isActive ? 'Active' : 'Deactivated'}</Pill>
                {detail.user.isLocked && <Pill tone="amber">Locked out</Pill>}
                {detail.user.isOnline && (
                  <span className="flex items-center gap-1.5">
                    <LiveDot />
                    <span className="text-[11px] font-medium text-emerald-700">Online</span>
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><p className="text-muted">Sign-in method</p><p className="mt-0.5 font-medium text-ink">{detail.user.authProvider === 'google' ? 'Google' : 'Password'}{detail.user.googleLinked ? ' (Google linked)' : ''}</p></div>
              <div><p className="text-muted">2-step verification</p><p className="mt-0.5 font-medium text-ink">{detail.user.mfaEnabled ? 'On' : 'Off'}</p></div>
              <div><p className="text-muted">Country</p><p className="mt-0.5 font-medium text-ink">{detail.user.country || '—'}</p></div>
              <div><p className="text-muted">Currency</p><p className="mt-0.5 font-medium text-ink">{detail.user.currency || '—'}</p></div>
              <div><p className="text-muted">Language</p><p className="mt-0.5 font-medium text-ink">{detail.user.language || '—'}</p></div>
              <div><p className="text-muted">Joined</p><p className="mt-0.5 font-medium text-ink">{formatDateTime(detail.user.createdAt)}</p></div>
              <div><p className="text-muted">Last login</p><p className="mt-0.5 font-medium text-ink">{formatDateTime(detail.user.lastLoginAt)}</p></div>
              <div><p className="text-muted">Onboarding</p><p className="mt-0.5 font-medium text-ink">{detail.user.onboardingCompleted ? 'Completed' : 'Not finished'}</p></div>
            </div>

            {!editing && detail.user.adminNotes && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Admin notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-amber-900">{detail.user.adminNotes}</p>
              </div>
            )}

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted">Manage account</h3>
                {!editing && (
                  <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-accent hover:underline">
                    Edit
                  </button>
                )}
              </div>
              {editing ? (
                <form onSubmit={saveEdits} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
                  <FormField label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  <FormField
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <FormField label="Country" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value.toUpperCase() }))} placeholder="PK" />
                    <FormField label="Currency" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} placeholder="PKR" />
                    <FormField label="Language" value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))} placeholder="en" />
                  </div>
                  <label className="flex items-center justify-between rounded-lg border border-border bg-white px-3 py-2.5">
                    <span className="text-xs font-medium text-ink">Onboarding completed</span>
                    <input
                      type="checkbox"
                      checked={form.onboardingCompleted}
                      onChange={(e) => setForm((f) => ({ ...f, onboardingCompleted: e.target.checked }))}
                      className="h-4 w-4 accent-ink"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-medium text-muted">Admin notes (only you see this)</span>
                    <textarea
                      value={form.adminNotes}
                      onChange={(e) => setForm((f) => ({ ...f, adminNotes: e.target.value }))}
                      rows={3}
                      placeholder="e.g. refunded manually, see ticket #42"
                      className="w-full resize-y rounded-lg border border-border px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent"
                    />
                  </label>
                  <div className="flex gap-2 pt-1">
                    <Button type="submit" loading={busy === 'save'} loadingLabel="Saving…">Save changes</Button>
                    <button type="button" onClick={() => setEditing(false)} className="text-sm text-muted hover:text-ink">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}
            </section>

            <section>
              <h3 className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wide text-muted">Actions</h3>
              <div className="flex flex-col gap-2">
                {detail.user.isLocked && (
                  <button
                    type="button"
                    disabled={busy === 'unlock'}
                    onClick={() => run('unlock', () => unlockAdminUser(userId), 'Clear the lockout on this account? They will be able to try signing in again immediately.')}
                    className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-start text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-40"
                  >
                    <Lock className="h-4 w-4 shrink-0" /> Clear lockout
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy === 'mfa' || !detail.user.mfaEnabled}
                  onClick={() => run('mfa', () => disableAdminUserMfa(userId), 'Turn off 2-step verification for this account? They will be signed out everywhere.')}
                  className="flex items-center gap-2 rounded-lg border border-border px-3.5 py-2.5 text-start text-sm font-medium text-ink hover:bg-surface disabled:opacity-40"
                >
                  <ShieldOff className="h-4 w-4 shrink-0" /> Turn off 2-step verification
                </button>
                <button
                  type="button"
                  disabled={busy === 'reset' || !detail.user.hasPassword}
                  onClick={() => run('reset', () => forceAdminPasswordReset(userId), 'Email this user a password reset code?')}
                  className="flex items-center gap-2 rounded-lg border border-border px-3.5 py-2.5 text-start text-sm font-medium text-ink hover:bg-surface disabled:opacity-40"
                >
                  <KeyRound className="h-4 w-4 shrink-0" /> Send password reset code
                </button>
                {detail.user.isActive ? (
                  <button
                    type="button"
                    disabled={busy === 'deactivate'}
                    onClick={() => run('deactivate', () => deactivateAdminUser(userId), 'Deactivate this account? They will be signed out and unable to log back in until reactivated.')}
                    className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-start text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-40"
                  >
                    <Ban className="h-4 w-4 shrink-0" /> Deactivate account
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy === 'reactivate'}
                    onClick={() => run('reactivate', () => reactivateAdminUser(userId))}
                    className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-start text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0" /> Reactivate account
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy === 'delete'}
                  onClick={() =>
                    run(
                      'delete',
                      async () => {
                        await deleteAdminUser(userId);
                        onClose();
                      },
                      `Permanently delete ${detail.user.email}? This cannot be undone.`
                    )
                  }
                  className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-start text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4 shrink-0" /> Delete account permanently
                </button>
              </div>
            </section>

            <section>
              <h3 className="mb-2 flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wide text-muted">
                <Laptop className="h-3.5 w-3.5" /> Sessions ({detail.sessions.length})
              </h3>
              {detail.sessions.length === 0 ? (
                <p className="text-sm text-muted">Not signed in anywhere.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
                  {detail.sessions.map((session) => (
                    <li key={session.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{session.device}</p>
                        <p className="truncate text-xs text-muted">{session.ip} · last used {formatDateTime(session.lastUsedAt)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => run(`session-${session.id}`, () => revokeAdminUserSession(userId, session.id))}
                        disabled={busy === `session-${session.id}`}
                        className="shrink-0 text-xs font-medium text-red-600 hover:underline disabled:opacity-40"
                      >
                        Sign out
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wide text-muted">Recent activity</h3>
              {detail.events.length === 0 ? (
                <p className="text-sm text-muted">No recorded activity.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
                  {detail.events.slice(0, 15).map((event) => (
                    <li key={event.id} className="flex items-center justify-between gap-3 px-3.5 py-2 text-xs">
                      <span className="font-mono text-ink">{event.event}</span>
                      <span className="shrink-0 text-muted">{formatDateTime(event.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// --- Users list -------------------------------------------------------------

function UsersSection() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  // Debounced separately from `search` itself - the input updates on every
  // keystroke, but a fetch only fires 350ms after typing stops. Previously
  // the search-change effect reset the page and re-fetched in the same
  // tick using a stale `page` value from its closure (setPage is async),
  // which could fetch the wrong page right before the page-change effect
  // silently re-fetched the right one a moment later. Routing both search
  // and page through the SAME effect removes the stale-closure path
  // entirely - there's only one place a fetch gets triggered from now.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  const load = useCallback(
    async (silent) => {
      if (!silent) setLoading(true);
      try {
        const result = await listAdminUsers({ page, search: debouncedSearch, status });
        setData(result);
      } catch (error) {
        if (!silent) onError(error);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [page, debouncedSearch, status]
  );

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, status]);

  // Paused while a user's detail panel is open - that panel polls itself,
  // and this list's own poll would otherwise fight it for focus/scroll.
  usePolling(() => load(true), { enabled: !selectedId });

  const exportCsv = async () => {
    setExporting(true);
    try {
      const csv = await exportAdminUsersCsv({ search: debouncedSearch, status });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vaultrix-users-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      onError(error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <SectionCard
      title="Users"
      icon={UsersIcon}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface disabled:opacity-40"
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Export CSV
          </button>
          <button type="button" onClick={() => load(false)} className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-ink hover:bg-surface">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      }
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-lg border border-border py-2.5 ps-9 pe-3 text-sm outline-none focus:border-accent"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-border px-3 py-2.5 text-sm text-ink"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="deactivated">Deactivated</option>
          <option value="online">Online now</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : !data || data.users.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No users match.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border text-start font-mono text-[11px] uppercase tracking-wide text-muted">
                <th className="py-2 text-start font-medium">User</th>
                <th className="py-2 text-start font-medium">Status</th>
                <th className="py-2 text-start font-medium">Joined</th>
                <th className="py-2 text-start font-medium">Last login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.users.map((u) => (
                <tr key={u.id} onClick={() => setSelectedId(u.id)} className="cursor-pointer hover:bg-surface">
                  <td className="py-2.5">
                    <p className="font-medium text-ink">{u.name}</p>
                    <p className="text-xs text-muted">{u.email}</p>
                  </td>
                  <td className="py-2.5">
                    <div className="flex flex-wrap gap-1">
                      <Pill tone={u.isActive ? 'green' : 'red'}>{u.isActive ? 'Active' : 'Deactivated'}</Pill>
                      {u.isOnline && <Pill tone="amber">Online</Pill>}
                    </div>
                  </td>
                  <td className="py-2.5 font-mono text-xs text-muted">{formatDateTime(u.createdAt)}</td>
                  <td className="py-2.5 font-mono text-xs text-muted">{formatDateTime(u.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}

      {selectedId && <UserDetailPanel userId={selectedId} onClose={() => setSelectedId(null)} onChanged={() => load(true)} />}
    </SectionCard>
  );
}

// --- Audit log -------------------------------------------------------------

function AuditLogSection() {
  const [page, setPage] = useState(1);
  const [eventFilter, setEventFilter] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (silent) => {
      if (!silent) setLoading(true);
      try {
        const result = await getAdminAuditLog({ page, event: eventFilter });
        setData(result);
      } catch (error) {
        if (!silent) onError(error);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [page, eventFilter]
  );

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, eventFilter]);

  usePolling(() => load(true));

  return (
    <SectionCard title="Signup & security audit log" subtitle="Every logged security event, newest first." icon={ScrollText}>
      {data?.eventTypes?.length > 0 && (
        <select
          value={eventFilter}
          onChange={(e) => {
            setEventFilter(e.target.value);
            setPage(1);
          }}
          className="mb-4 rounded-lg border border-border px-3 py-2.5 text-sm text-ink"
        >
          <option value="">All event types</option>
          {data.eventTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : !data || data.events.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No events recorded.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          <AnimatePresence initial={false}>
            {data.events.map((event) => (
              <motion.li
                key={event.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col gap-0.5 py-2.5 text-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-ink">{event.event}</span>
                  <span className="shrink-0 font-mono text-xs text-muted">{formatDateTime(event.createdAt)}</span>
                </div>
                <p className="text-xs text-muted">
                  {event.ip || '—'} {event.path ? `· ${event.path}` : ''}
                </p>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
    </SectionCard>
  );
}

// --- Security -------------------------------------------------------------

function SecuritySection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async (silent) => {
    if (!silent) setLoading(true);
    try {
      const result = await getAdminSecurityOverview();
      setData(result);
    } catch (error) {
      if (!silent) onError(error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  usePolling(() => load(true));

  const unlock = async (id) => {
    if (!window.confirm('Clear the lockout on this account? They will be able to try signing in again immediately.')) return;
    setBusy(id);
    try {
      await unlockAdminUser(id);
      notify.success('Unlocked.');
      await load(false);
    } catch (error) {
      onError(error);
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-white px-4 py-3.5 shadow-sm">
          <p className="font-mono text-2xl font-bold tabular-nums text-ink">{data.lockedAccounts.length}</p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">Currently locked out</p>
        </div>
        <div className="rounded-xl border border-border bg-white px-4 py-3.5 shadow-sm">
          <p className="font-mono text-2xl font-bold tabular-nums text-ink">{data.failedLoginsToday}</p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">Failed sign-ins, last 24h</p>
        </div>
      </div>

      <SectionCard title="Locked-out accounts" subtitle="Blocked by the automatic failed-login lockout - not a deactivated account." icon={Lock}>
        {data.lockedAccounts.length === 0 ? (
          <p className="text-sm text-muted">Nobody is currently locked out.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {data.lockedAccounts.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{u.name}</p>
                  <p className="truncate text-xs text-muted">
                    {u.email} · {u.failedLoginAttempts} failed attempt{u.failedLoginAttempts === 1 ? '' : 's'} · unlocks{' '}
                    {formatDateTime(u.lockUntil)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy === u.id}
                  onClick={() => unlock(u.id)}
                  className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface disabled:opacity-40"
                >
                  Unlock now
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Recent sign-in security events" subtitle="Failed logins, lockouts, and wrong 2-step codes, newest first." icon={ShieldAlert}>
        {data.events.length === 0 ? (
          <p className="text-sm text-muted">No events recorded.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {data.events.map((event) => (
              <li key={event.id} className="flex flex-col gap-0.5 py-2.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-ink">{event.event}</span>
                  <span className="shrink-0 font-mono text-xs text-muted">{formatDateTime(event.createdAt)}</span>
                </div>
                <p className="text-xs text-muted">
                  {event.userName ? `${event.userName} (${event.userEmail})` : 'Unknown account'} {event.ip ? `· ${event.ip}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

// --- Page shell -------------------------------------------------------------

const SECTIONS = [
  { id: 'overview', label: 'Overview', Icon: LayoutDashboard, Component: OverviewSection },
  { id: 'users', label: 'Users', Icon: UsersIcon, Component: UsersSection },
  { id: 'security', label: 'Security', Icon: ShieldAlert, Component: SecuritySection },
  { id: 'audit', label: 'Audit log', Icon: ScrollText, Component: AuditLogSection },
];

function AdminPage() {
  const [active, setActive] = useState('overview');
  const { t } = useTranslation();
  const current = SECTIONS.find((s) => s.id === active) || SECTIONS[0];
  const ActiveComponent = current.Component;

  const items = SECTIONS.map((section) => ({
    id: section.id,
    label: section.label,
    icon: section.Icon,
    onSelect: () => setActive(section.id),
  }));
  const footerItems = [{ id: 'back', label: t('nav.backToDashboard'), icon: ArrowLeft, to: '/dashboard' }];

  return (
    <AppShell title={t('nav.admin')} pageTitle={t('nav.admin')} items={items} activeId={current.id} footerItems={footerItems}>
      <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <h1 className="mb-6 text-xl font-semibold tracking-tight text-ink">{current.label}</h1>
        <AnimatePresence mode="wait">
          <motion.div key={current.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
            <ActiveComponent />
          </motion.div>
        </AnimatePresence>
      </div>
    </AppShell>
  );
}

export default AdminPage;
