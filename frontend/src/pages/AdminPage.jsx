// Admin Dashboard - restricted to ADMIN_EMAIL (see RequireAdmin.jsx and
// backend/src/middleware/requireAdmin.js). This is a tool for Vaultrix's
// own operator, not part of the regular product surface, so unlike every
// other page in this app it does NOT go through the i18n t() system -
// hardcoding English here avoids maintaining ~100 translation keys across
// 6 locales for a page exactly one person will ever see. If that stops
// being true, this should be revisited.
//
// Visual language is deliberately its own thing (dark, sharp-edged,
// neon-accented) and scoped entirely to this file - nothing here touches
// the rest of the app's light theme or shared components. DashboardHeader
// is the only shared piece this page still renders.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowLeft,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Laptop,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  ScrollText,
  Search,
  ShieldOff,
  Trash2,
  Users as UsersIcon,
  X,
  Zap,
} from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader.jsx';
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
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-400" />
    </span>
  );
}

// --- Shared bits -------------------------------------------------------------

function Pill({ tone = 'neutral', children }) {
  const tones = {
    neutral: 'bg-white/5 text-slate-300 border border-white/10',
    green: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30',
    red: 'bg-rose-500/10 text-rose-300 border border-rose-500/30',
    amber: 'bg-amber-500/10 text-amber-300 border border-amber-500/30',
    violet: 'bg-violet-500/10 text-violet-300 border border-violet-500/30',
  };
  return (
    <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-medium tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  );
}

function SectionCard({ title, subtitle, children, actions, icon: Icon }) {
  return (
    <section className="relative overflow-hidden rounded-md border border-white/10 bg-[#0b0d14] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" />
      <div className="flex items-start justify-between gap-3 border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-2.5">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-violet-400" />}
          <div>
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-100">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
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
        className="flex h-8 w-8 items-center justify-center rounded-sm border border-white/10 text-slate-300 transition hover:border-violet-400/50 hover:text-white disabled:opacity-30"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="font-mono text-xs text-slate-500">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="flex h-8 w-8 items-center justify-center rounded-sm border border-white/10 text-slate-300 transition hover:border-violet-400/50 hover:text-white disabled:opacity-30"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function DarkField({ label, ...rest }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <input
        className="w-full rounded-sm border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-violet-400/60 focus:ring-1 focus:ring-violet-400/30"
        {...rest}
      />
    </label>
  );
}

function DarkButton({ children, tone = 'violet', loading, className = '', ...rest }) {
  const tones = {
    violet: 'bg-violet-500 text-white hover:bg-violet-400',
    ghost: 'border border-white/10 text-slate-300 hover:border-white/30 hover:text-white',
  };
  return (
    <button
      type="submit"
      className={`flex items-center justify-center gap-2 rounded-sm px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]} ${className}`}
      disabled={loading}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
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
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (!data) return null;

  const stats = [
    { label: 'Total users', value: data.overview.totalUsers },
    { label: 'Active', value: data.overview.activeUsers },
    { label: 'Deactivated', value: data.overview.deactivatedUsers },
    { label: 'Online now', value: data.overview.onlineNow, live: true },
    { label: 'Signups today', value: data.overview.signupsToday },
    { label: 'Signups this week', value: data.overview.signupsThisWeek },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            layout
            className="relative overflow-hidden rounded-md border border-white/10 bg-[#0b0d14] px-4 py-3.5"
            style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)' }}
          >
            <div className="flex items-center gap-1.5">
              <AnimatePresence mode="popLayout">
                <motion.p
                  key={stat.value}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-display text-2xl font-extrabold text-white"
                >
                  {stat.value}
                </motion.p>
              </AnimatePresence>
              {stat.live && <LiveDot />}
            </div>
            <p className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <SectionCard title="Recent signups" icon={UsersIcon}>
        {data.recentSignups.length === 0 ? (
          <p className="text-sm text-slate-500">No signups yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-white/5">
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
                    <p className="truncate font-medium text-slate-100">{u.name}</p>
                    <p className="truncate text-xs text-slate-500">{u.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Pill>{u.authProvider === 'google' ? 'Google' : 'Password'}</Pill>
                    <span className="font-mono text-xs text-slate-500">{formatDateTime(u.createdAt)}</span>
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
  const [form, setForm] = useState({ name: '', email: '', country: '', currency: '', language: '', onboardingCompleted: false });

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
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-white/10 bg-[#0b0d14]"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-100">User detail</h2>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-sm text-slate-400 hover:bg-white/5 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading || !detail ? (
          <div className="flex flex-1 items-center justify-center text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-6 p-6">
            <div className="flex items-center gap-3">
              {detail.user.avatarUrl ? (
                <img src={detail.user.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover ring-1 ring-white/10" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/20 text-sm font-medium text-violet-200 ring-1 ring-violet-400/30">
                  {(detail.user.name || '?').slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-100">{detail.user.name}</p>
                <p className="truncate text-xs text-slate-500">{detail.user.email}</p>
              </div>
              <div className="ms-auto flex flex-col items-end gap-1">
                <Pill tone={detail.user.isActive ? 'green' : 'red'}>{detail.user.isActive ? 'Active' : 'Deactivated'}</Pill>
                {detail.user.isOnline && (
                  <span className="flex items-center gap-1.5">
                    <LiveDot />
                    <span className="text-[11px] text-lime-300">Online</span>
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><p className="text-slate-500">Sign-in method</p><p className="mt-0.5 font-medium text-slate-200">{detail.user.authProvider === 'google' ? 'Google' : 'Password'}{detail.user.googleLinked ? ' (Google linked)' : ''}</p></div>
              <div><p className="text-slate-500">2-step verification</p><p className="mt-0.5 font-medium text-slate-200">{detail.user.mfaEnabled ? 'On' : 'Off'}</p></div>
              <div><p className="text-slate-500">Country</p><p className="mt-0.5 font-medium text-slate-200">{detail.user.country || '—'}</p></div>
              <div><p className="text-slate-500">Currency</p><p className="mt-0.5 font-medium text-slate-200">{detail.user.currency || '—'}</p></div>
              <div><p className="text-slate-500">Language</p><p className="mt-0.5 font-medium text-slate-200">{detail.user.language || '—'}</p></div>
              <div><p className="text-slate-500">Joined</p><p className="mt-0.5 font-medium text-slate-200">{formatDateTime(detail.user.createdAt)}</p></div>
              <div><p className="text-slate-500">Last login</p><p className="mt-0.5 font-medium text-slate-200">{formatDateTime(detail.user.lastLoginAt)}</p></div>
              <div><p className="text-slate-500">Onboarding</p><p className="mt-0.5 font-medium text-slate-200">{detail.user.onboardingCompleted ? 'Completed' : 'Not finished'}</p></div>
            </div>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Manage account</h3>
                {!editing && (
                  <button type="button" onClick={() => setEditing(true)} className="text-xs font-semibold text-violet-400 hover:text-violet-300">
                    Edit
                  </button>
                )}
              </div>
              {editing ? (
                <form onSubmit={saveEdits} className="flex flex-col gap-3 rounded-sm border border-white/10 bg-black/20 p-4">
                  <DarkField label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  <DarkField
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <DarkField label="Country" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value.toUpperCase() }))} placeholder="PK" />
                    <DarkField label="Currency" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} placeholder="PKR" />
                    <DarkField label="Language" value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))} placeholder="en" />
                  </div>
                  <label className="flex items-center justify-between rounded-sm border border-white/10 px-3 py-2.5">
                    <span className="text-xs font-medium text-slate-300">Onboarding completed</span>
                    <input
                      type="checkbox"
                      checked={form.onboardingCompleted}
                      onChange={(e) => setForm((f) => ({ ...f, onboardingCompleted: e.target.checked }))}
                      className="h-4 w-4 accent-violet-500"
                    />
                  </label>
                  <div className="flex gap-2 pt-1">
                    <DarkButton loading={busy === 'save'}>Save changes</DarkButton>
                    <button type="button" onClick={() => setEditing(false)} className="text-sm text-slate-500 hover:text-slate-300">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}
            </section>

            <section>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Actions</h3>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={busy === 'mfa' || !detail.user.mfaEnabled}
                  onClick={() => run('mfa', () => disableAdminUserMfa(userId), 'Turn off 2-step verification for this account? They will be signed out everywhere.')}
                  className="flex items-center gap-2 rounded-sm border border-white/10 px-3.5 py-2.5 text-start text-sm font-medium text-slate-200 transition hover:border-white/30 disabled:opacity-40"
                >
                  <ShieldOff className="h-4 w-4 shrink-0" /> Turn off 2-step verification
                </button>
                <button
                  type="button"
                  disabled={busy === 'reset' || !detail.user.hasPassword}
                  onClick={() => run('reset', () => forceAdminPasswordReset(userId), 'Email this user a password reset code?')}
                  className="flex items-center gap-2 rounded-sm border border-white/10 px-3.5 py-2.5 text-start text-sm font-medium text-slate-200 transition hover:border-white/30 disabled:opacity-40"
                >
                  <KeyRound className="h-4 w-4 shrink-0" /> Send password reset code
                </button>
                {detail.user.isActive ? (
                  <button
                    type="button"
                    disabled={busy === 'deactivate'}
                    onClick={() => run('deactivate', () => deactivateAdminUser(userId), 'Deactivate this account? They will be signed out and unable to log back in until reactivated.')}
                    className="flex items-center gap-2 rounded-sm border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-start text-sm font-medium text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-40"
                  >
                    <Ban className="h-4 w-4 shrink-0" /> Deactivate account
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy === 'reactivate'}
                    onClick={() => run('reactivate', () => reactivateAdminUser(userId))}
                    className="flex items-center gap-2 rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-start text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-40"
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
                  className="flex items-center gap-2 rounded-sm border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-start text-sm font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4 shrink-0" /> Delete account permanently
                </button>
              </div>
            </section>

            <section>
              <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <Laptop className="h-3.5 w-3.5" /> Sessions ({detail.sessions.length})
              </h3>
              {detail.sessions.length === 0 ? (
                <p className="text-sm text-slate-500">Not signed in anywhere.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-white/5 rounded-sm border border-white/10">
                  {detail.sessions.map((session) => (
                    <li key={session.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-200">{session.device}</p>
                        <p className="truncate text-xs text-slate-500">{session.ip} · last used {formatDateTime(session.lastUsedAt)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => run(`session-${session.id}`, () => revokeAdminUserSession(userId, session.id))}
                        disabled={busy === `session-${session.id}`}
                        className="shrink-0 text-xs font-medium text-rose-400 hover:text-rose-300 disabled:opacity-40"
                      >
                        Sign out
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Recent activity</h3>
              {detail.events.length === 0 ? (
                <p className="text-sm text-slate-500">No recorded activity.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-white/5 rounded-sm border border-white/10">
                  {detail.events.slice(0, 15).map((event) => (
                    <li key={event.id} className="flex items-center justify-between gap-3 px-3.5 py-2 text-xs">
                      <span className="font-mono text-slate-300">{event.event}</span>
                      <span className="shrink-0 text-slate-500">{formatDateTime(event.createdAt)}</span>
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
  const [status, setStatus] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(
    async (silent) => {
      if (!silent) setLoading(true);
      try {
        const result = await listAdminUsers({ page, search, status });
        setData(result);
      } catch (error) {
        if (!silent) onError(error);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [page, search, status]
  );

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      load(false);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Paused while a user's detail panel is open - that panel polls itself,
  // and this list's own poll would otherwise fight it for focus/scroll.
  usePolling(() => load(true), { enabled: !selectedId });

  return (
    <SectionCard
      title="Users"
      icon={UsersIcon}
      actions={
        <button type="button" onClick={() => load(false)} className="flex h-8 w-8 items-center justify-center rounded-sm border border-white/10 text-slate-300 transition hover:border-violet-400/50 hover:text-white">
          <RefreshCw className="h-4 w-4" />
        </button>
      }
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-sm border border-white/10 bg-black/30 py-2.5 ps-9 pe-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-violet-400/60"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-sm border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-slate-200"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="deactivated">Deactivated</option>
          <option value="online">Online now</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : !data || data.users.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No users match.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-start text-[11px] uppercase tracking-wide text-slate-500">
                <th className="py-2 text-start font-medium">User</th>
                <th className="py-2 text-start font-medium">Status</th>
                <th className="py-2 text-start font-medium">Joined</th>
                <th className="py-2 text-start font-medium">Last login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.users.map((u) => (
                <tr key={u.id} onClick={() => setSelectedId(u.id)} className="cursor-pointer transition hover:bg-white/5">
                  <td className="py-2.5">
                    <p className="font-medium text-slate-100">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </td>
                  <td className="py-2.5">
                    <div className="flex flex-wrap gap-1">
                      <Pill tone={u.isActive ? 'green' : 'red'}>{u.isActive ? 'Active' : 'Deactivated'}</Pill>
                      {u.isOnline && <Pill tone="amber">Online</Pill>}
                    </div>
                  </td>
                  <td className="py-2.5 font-mono text-xs text-slate-500">{formatDateTime(u.createdAt)}</td>
                  <td className="py-2.5 font-mono text-xs text-slate-500">{formatDateTime(u.lastLoginAt)}</td>
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
          className="mb-4 rounded-sm border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-slate-200"
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
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : !data || data.events.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No events recorded.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-white/5">
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
                  <span className="font-mono text-xs text-violet-300">{event.event}</span>
                  <span className="shrink-0 font-mono text-xs text-slate-500">{formatDateTime(event.createdAt)}</span>
                </div>
                <p className="text-xs text-slate-500">
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

// --- Page shell -------------------------------------------------------------

const SECTIONS = [
  { id: 'overview', label: 'Overview', Icon: LayoutDashboard, Component: OverviewSection },
  { id: 'users', label: 'Users', Icon: UsersIcon, Component: UsersSection },
  { id: 'audit', label: 'Audit log', Icon: ScrollText, Component: AuditLogSection },
];

function AdminPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState('overview');
  const ActiveComponent = useMemo(() => SECTIONS.find((s) => s.id === active)?.Component || OverviewSection, [active]);

  return (
    <div className="admin-dark min-h-screen bg-[#05050a]">
      <DashboardHeader />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #ffffff22 1px, transparent 1px), linear-gradient(to bottom, #ffffff22 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />

      <div className="relative mx-auto flex max-w-7xl gap-6 px-6 py-8">
        <aside className="sticky top-8 flex h-fit w-56 shrink-0 flex-col gap-1 rounded-md border border-white/10 bg-[#0b0d14] p-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="mb-2 flex items-center gap-2 rounded-sm px-2.5 py-2 text-xs font-medium text-slate-500 transition hover:bg-white/5 hover:text-slate-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Vaultrix
          </button>

          <div className="mb-3 flex items-center gap-2 border-b border-white/10 px-2.5 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-gradient-to-br from-violet-500 to-cyan-400">
              <Zap className="h-4 w-4 text-black" />
            </div>
            <div>
              <p className="font-display text-sm font-extrabold leading-none text-white">ADMIN</p>
              <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                <LiveDot /> live
              </p>
            </div>
          </div>

          {SECTIONS.map((section) => {
            const isActive = active === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActive(section.id)}
                className={`relative flex items-center gap-2.5 overflow-hidden rounded-sm px-2.5 py-2.5 text-start text-sm font-medium transition ${
                  isActive ? 'bg-violet-500/15 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                {isActive && <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-violet-400 shadow-[0_0_8px_1px_rgba(167,139,250,0.8)]" />}
                <section.Icon className="h-4 w-4 shrink-0" />
                {section.label}
              </button>
            );
          })}
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-6 flex items-center gap-2">
            <Activity className="h-5 w-5 text-violet-400" />
            <div>
              <h1 className="font-display text-xl font-extrabold tracking-tight text-white">
                {SECTIONS.find((s) => s.id === active)?.label}
              </h1>
              <p className="text-xs text-slate-500">Operator-only tools. Not part of the regular Vaultrix product.</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <ActiveComponent />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default AdminPage;
