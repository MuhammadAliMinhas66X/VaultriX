// Plain helpers for the admin System health screen. English only on purpose:
// the admin area is not translated (see the note at the top of AdminPage.jsx).

const STATUS_TEXT = {
  ok: 'Operational',
  degraded: 'Degraded',
  down: 'Down',
  not_configured: 'Not configured',
  unknown: 'Not checked yet',
};

export const statusText = (status) => STATUS_TEXT[status] || STATUS_TEXT.unknown;

const FAILURE_TEXT = {
  timeout: 'The check took too long and was stopped.',
  unreachable: 'The service could not be reached.',
  auth_failed: 'The service refused our credentials.',
  bad_response: 'The service answered, but not as expected.',
  not_ready: 'The connection is not ready.',
  slow: 'Working, but slower than normal.',
  error: 'The check failed.',
};

export const failureText = (category) => (category ? FAILURE_TEXT[category] || FAILURE_TEXT.error : '');

export const formatLatency = (ms) => {
  if (ms === null || ms === undefined) return 'n/a';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
};

export const formatAgo = (iso, nowMs = Date.now()) => {
  if (!iso) return 'never';
  const seconds = Math.max(0, Math.round((nowMs - new Date(iso).getTime()) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
};

export const formatUptime = (seconds) => {
  if (!Number.isFinite(seconds)) return 'n/a';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export const formatPercent = (value) => (value === null || value === undefined ? 'n/a' : `${value}%`);
