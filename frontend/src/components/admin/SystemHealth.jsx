// Admin > System health. English only, like the rest of the admin area.
// What each indicator means, and what it does not guarantee, is written in
// docs/audit/API-HEALTH-MONITORING.md.
import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2, Minus, RefreshCw } from 'lucide-react';
import { getAdminHealth, runAdminHealthCheck } from '../../services/adminService.js';
import { notify } from '../../i18n/notifications.js';
import { failureText, formatAgo, formatLatency, formatPercent, formatUptime, statusText } from '../../utils/healthView.js';

const REFRESH_MS = 60 * 1000;

// Status is always an icon AND a word, never colour alone.
const STATUS_STYLE = {
  ok: { Icon: CheckCircle2, tone: 'text-emerald-700' },
  degraded: { Icon: AlertTriangle, tone: 'text-amber-700' },
  down: { Icon: AlertCircle, tone: 'text-red-700' },
  not_configured: { Icon: Minus, tone: 'text-muted' },
  unknown: { Icon: Info, tone: 'text-muted' },
};

function StatusLabel({ status }) {
  const { Icon, tone } = STATUS_STYLE[status] || STATUS_STYLE.unknown;
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${tone}`}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {statusText(status)}
    </span>
  );
}

function Fact({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function ServiceCard({ service, nowMs }) {
  const note = failureText(service.failureCategory);
  return (
    <li className="rounded-xl border border-border bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">{service.label}</h3>
          <p className="mt-0.5 text-xs text-muted">{service.kind === 'core' ? 'Core service' : 'External service'}</p>
        </div>
        <StatusLabel status={service.status} />
      </div>

      {service.status === 'not_configured' ? (
        <p className="mt-4 text-sm text-muted">This service is not set up on this server, so it is not checked.</p>
      ) : (
        <>
          {note && <p className="mt-3 text-sm text-ink">{note}</p>}
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
            <Fact label="Response time" value={formatLatency(service.latencyMs)} />
            <Fact label="Last checked" value={formatAgo(service.lastCheckedAt, nowMs)} />
            <Fact label="Last success" value={formatAgo(service.lastSuccessAt, nowMs)} />
            <Fact label="Last failure" value={formatAgo(service.lastFailureAt, nowMs)} />
            <Fact label={`Success, last ${service.recentChecks} checks`} value={formatPercent(service.recentSuccessRatePercent)} />
          </dl>
        </>
      )}
    </li>
  );
}

function SystemHealth() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [failed, setFailed] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const load = useCallback(async ({ force = false, silent = false } = {}) => {
    if (!silent && !force) setLoading(true);
    if (force) setChecking(true);
    try {
      const result = force ? await runAdminHealthCheck() : await getAdminHealth();
      setData(result);
      setFailed(false);
      setNowMs(Date.now());
      if (force && result?.cache?.throttled) notify.info('Checked a moment ago. Showing the latest result.');
    } catch (error) {
      setFailed(true);
      if (!silent) notify.error(error?.message || 'Could not load system health.');
    } finally {
      setLoading(false);
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Cheap on the server (answers are cached), and paused in a hidden tab.
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) load({ silent: true });
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading system health...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-border bg-white p-6">
        <p className="text-sm text-ink">System health could not be loaded. The backend may be unreachable.</p>
        <button type="button" onClick={() => load()} className="mt-4 inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-medium text-ink hover:bg-surface">
          Try again
        </button>
      </div>
    );
  }

  const requests = data.requests;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-white px-6 py-5" aria-live="polite">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-accent" aria-hidden="true" />
          <div>
            <p className="text-xs text-muted">Overall status</p>
            <p className="mt-0.5 text-lg font-semibold"><StatusLabel status={data.overall} /></p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-xs text-muted">
            Updated {formatAgo(data.generatedAt, nowMs)}
            {failed && ' (last refresh failed)'}
          </p>
          <button
            type="button"
            onClick={() => load({ force: true })}
            disabled={checking}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-medium text-ink hover:bg-surface disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} aria-hidden="true" />
            {checking ? 'Checking...' : 'Check now'}
          </button>
        </div>
      </section>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.services.map((service) => (
          <ServiceCard key={service.id} service={service} nowMs={nowMs} />
        ))}
      </ul>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-white p-5">
          <h3 className="text-sm font-semibold text-ink">Requests</h3>
          {requests ? (
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
              <Fact label={`Handled, last ${requests.windowMinutes} min`} value={requests.total} />
              <Fact label="Server errors (5xx)" value={requests.serverErrors} />
              <Fact label="Server error rate" value={formatPercent(requests.errorRatePercent)} />
              <Fact label="Server running for" value={formatUptime(data.process?.uptimeSeconds)} />
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted">Not available.</p>
          )}
        </section>

        <section className="rounded-xl border border-border bg-white p-5">
          <h3 className="text-sm font-semibold text-ink">Recent failures</h3>
          {data.recentFailures.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No failed checks since the server started.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {data.recentFailures.slice(0, 8).map((item) => (
                <li key={`${item.service}-${item.at}`} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                  <span className="text-ink">{data.services.find((s) => s.id === item.service)?.label || item.service}</span>
                  <span className="text-right text-xs text-muted">{failureText(item.category)} {formatAgo(item.at, nowMs)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <details className="rounded-xl border border-border bg-white px-5 py-4 text-sm text-muted">
        <summary className="cursor-pointer font-medium text-ink">What these numbers mean</summary>
        <ul className="mt-3 list-disc space-y-1.5 ps-5">
          <li>Each status comes from the latest check made by this server. It is not an uptime guarantee.</li>
          <li>Counts and rates cover this server instance only and reset when it restarts.</li>
          <li>Core services are checked about every minute. External services are checked about every five minutes.</li>
          <li>Exchange-rate tables are checked, not the unofficial live quotes. Google sign-in and the captcha are not checked.</li>
          <li>No keys, addresses or error text from the services are shown here.</li>
        </ul>
      </details>
    </div>
  );
}

export default SystemHealth;
