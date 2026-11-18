// Health monitor core. Pure logic: it knows nothing about Express, MongoDB or
// any provider, so it can be unit tested with fake probes.
//
// What it guarantees (and what it does not) is written in
// docs/audit/API-HEALTH-MONITORING.md. In short: a status here means "the
// last check of this service succeeded or failed from THIS server process".
// It is not an uptime SLA, it is per instance, and it resets on restart.
//
// Safety rules baked in:
// - Probes are declared in code. Nothing a caller sends can choose a target,
//   so a health check cannot be turned into an SSRF probe.
// - Raw error messages never leave this module. A failure is reduced to a
//   fixed category, because messages from drivers and SMTP libraries can hold
//   host names, user names or connection details.
// - Results are cached, probes run once at a time (single flight), and a
//   forced re-check is throttled.

export const STATUS = Object.freeze({
  OK: 'ok',
  DEGRADED: 'degraded',
  DOWN: 'down',
  NOT_CONFIGURED: 'not_configured',
  UNKNOWN: 'unknown',
});

export const FAILURE = Object.freeze({
  TIMEOUT: 'timeout',
  UNREACHABLE: 'unreachable',
  AUTH_FAILED: 'auth_failed',
  BAD_RESPONSE: 'bad_response',
  NOT_READY: 'not_ready',
  ERROR: 'error',
});

const TIMEOUT_CODE = 'VAULTRIX_HEALTH_TIMEOUT';

export class ProbeFailure extends Error {
  constructor(category) {
    super(category);
    this.category = category;
  }
}

export const withTimeout = (promise, ms) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error('probe timed out');
      error.code = TIMEOUT_CODE;
      reject(error);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

// Maps any thrown value to one fixed word. The message is read only to pick
// the word and is never returned.
export const classifyError = (error) => {
  if (error instanceof ProbeFailure) return error.category;
  const code = String(error?.code || '');
  const text = String(error?.message || '').toLowerCase();

  if (code === TIMEOUT_CODE || code === 'ETIMEDOUT' || code === 'ESOCKET' || /timed? ?out|timeout/.test(text)) {
    return FAILURE.TIMEOUT;
  }
  if (code === 'EAUTH' || code === 'EENVELOPE' || /unauthori[sz]ed|authentication|invalid (api )?key|invalid credentials|\b401\b|\b403\b/.test(text)) {
    return FAILURE.AUTH_FAILED;
  }
  if (['ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET', 'EAI_AGAIN', 'EHOSTUNREACH', 'ECONNECTION'].includes(code) || /econnrefused|enotfound|getaddrinfo|network|fetch failed/.test(text)) {
    return FAILURE.UNREACHABLE;
  }
  if (/unexpected response|bad response|invalid response/.test(text)) return FAILURE.BAD_RESPONSE;
  return FAILURE.ERROR;
};

const percent = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);

// Rolling request counters, one bucket per minute. In memory, per process.
export const createRequestMetrics = ({ now = Date.now, windowMinutes = 15, ignorePrefixes = ['/api/health', '/api/admin/health'] } = {}) => {
  const buckets = new Map();

  const prune = (minute) => {
    for (const key of buckets.keys()) {
      if (key <= minute - windowMinutes) buckets.delete(key);
    }
  };

  const record = (status) => {
    const minute = Math.floor(now() / 60000);
    prune(minute);
    const bucket = buckets.get(minute) || { total: 0, serverErrors: 0 };
    bucket.total += 1;
    if (status >= 500) bucket.serverErrors += 1;
    buckets.set(minute, bucket);
  };

  const middleware = (req, res, next) => {
    const path = String(req.originalUrl || req.url || '').split('?')[0];
    if (!ignorePrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
      res.on('finish', () => record(res.statusCode));
    }
    next();
  };

  const summary = () => {
    const minute = Math.floor(now() / 60000);
    prune(minute);
    let total = 0;
    let serverErrors = 0;
    for (const bucket of buckets.values()) {
      total += bucket.total;
      serverErrors += bucket.serverErrors;
    }
    return { windowMinutes, total, serverErrors, errorRatePercent: percent(serverErrors, total) };
  };

  return { middleware, record, summary };
};

const iso = (ms) => (ms ? new Date(ms).toISOString() : null);

export const createHealthMonitor = ({
  probes,
  now = Date.now,
  uptime = () => process.uptime(),
  ttlMs = 60 * 1000,
  forceMinIntervalMs = 15 * 1000,
  historySize = 20,
  failureLogSize = 20,
  metrics = null,
} = {}) => {
  const state = new Map();
  const failures = [];
  let inflight = null;
  let lastRunAt = 0;

  for (const probe of probes) {
    state.set(probe.id, {
      status: STATUS.UNKNOWN,
      latencyMs: null,
      checkedAt: 0,
      lastSuccessAt: 0,
      lastFailureAt: 0,
      failureCategory: null,
      history: [],
      detail: null,
    });
  }

  const probeTtl = (probe) => probe.ttlMs ?? ttlMs;

  const runProbe = async (probe) => {
    const entry = state.get(probe.id);
    const startedAt = now();

    if (probe.isConfigured && !probe.isConfigured()) {
      Object.assign(entry, { status: STATUS.NOT_CONFIGURED, latencyMs: null, checkedAt: startedAt, failureCategory: null, detail: null });
      return;
    }

    try {
      const result = await withTimeout(Promise.resolve().then(() => probe.run()), probe.timeoutMs ?? 5000);
      const latencyMs = Math.max(0, now() - startedAt);
      const slow = latencyMs > (probe.degradedMs ?? 1500);
      Object.assign(entry, {
        status: slow ? STATUS.DEGRADED : STATUS.OK,
        latencyMs,
        checkedAt: startedAt,
        lastSuccessAt: startedAt,
        failureCategory: slow ? 'slow' : null,
        // Probes may return a short, fixed-vocabulary note. Strings only.
        detail: typeof result?.detail === 'string' ? result.detail.slice(0, 80) : null,
      });
      entry.history.push(true);
    } catch (error) {
      const category = classifyError(error);
      Object.assign(entry, {
        status: STATUS.DOWN,
        latencyMs: Math.max(0, now() - startedAt),
        checkedAt: startedAt,
        lastFailureAt: startedAt,
        failureCategory: category,
        detail: null,
      });
      entry.history.push(false);
      failures.unshift({ at: iso(startedAt), service: probe.id, category });
      if (failures.length > failureLogSize) failures.length = failureLogSize;
    }

    if (entry.history.length > historySize) entry.history.splice(0, entry.history.length - historySize);
  };

  const overallStatus = () => {
    let degraded = false;
    for (const probe of probes) {
      const { status } = state.get(probe.id);
      if (status === STATUS.NOT_CONFIGURED || status === STATUS.UNKNOWN) continue;
      if (status === STATUS.DOWN) {
        if (probe.kind === 'core') return STATUS.DOWN;
        degraded = true;
      }
      if (status === STATUS.DEGRADED) degraded = true;
    }
    return degraded ? STATUS.DEGRADED : STATUS.OK;
  };

  const view = (meta) => ({
    generatedAt: iso(now()),
    overall: overallStatus(),
    cache: meta,
    process: { uptimeSeconds: Math.round(uptime()) },
    services: probes.map((probe) => {
      const entry = state.get(probe.id);
      const successes = entry.history.filter(Boolean).length;
      return {
        id: probe.id,
        label: probe.label,
        kind: probe.kind,
        status: entry.status,
        latencyMs: entry.latencyMs,
        lastCheckedAt: iso(entry.checkedAt),
        lastSuccessAt: iso(entry.lastSuccessAt),
        lastFailureAt: iso(entry.lastFailureAt),
        failureCategory: entry.failureCategory,
        detail: entry.detail,
        recentChecks: entry.history.length,
        recentSuccessRatePercent: percent(successes, entry.history.length),
      };
    }),
    requests: metrics ? metrics.summary() : null,
    recentFailures: failures.slice(),
  });

  const snapshot = async ({ force = false } = {}) => {
    if (inflight) {
      await inflight;
      return view({ refreshed: false, throttled: false, ttlSeconds: Math.round(ttlMs / 1000) });
    }

    const current = now();
    const throttled = force && current - lastRunAt < forceMinIntervalMs;
    const due = probes.filter((probe) => {
      const entry = state.get(probe.id);
      if (!entry.checkedAt) return true;
      if (force && !throttled) return true;
      return current - entry.checkedAt >= probeTtl(probe);
    });

    if (due.length === 0) {
      return view({ refreshed: false, throttled, ttlSeconds: Math.round(ttlMs / 1000) });
    }

    inflight = Promise.all(due.map(runProbe)).finally(() => {
      lastRunAt = now();
      inflight = null;
    });
    await inflight;
    return view({ refreshed: true, throttled: false, ttlSeconds: Math.round(ttlMs / 1000) });
  };

  return { snapshot };
};
