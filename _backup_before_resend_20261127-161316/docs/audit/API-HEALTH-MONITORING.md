# API health monitoring (admin System health)

## Endpoints
- `GET /api/health` (public, existing): liveness only, returns `{status:'ok'}`. Does not check the database.
- `GET /api/admin/health`: cached snapshot. Admin only (`authenticate` then `requireAdmin`; others get 401 or 404).
- `POST /api/admin/health/check`: re-runs checks. Admin only, `healthCheckLimiter` (30 per 15 min per user) plus a 15 s throttle inside the monitor.

## What is checked (only integrations that exist in the code)
| Id | Kind | Check | Interval |
|---|---|---|---|
| backend | core | event-loop delay | 60 s |
| database | core | MongoDB `ping` command | 60 s |
| email | external | SMTP connect and login, no mail sent; "not configured" if SMTP env is missing | 5 min |
| cloudinary | external | Admin API ping; "not configured" if absent | 5 min |
| exchangeRates | external | a rate table can be produced (uses the service's 10 min cache) | 5 min |

Not monitored on purpose: Google sign-in, Cloudflare Turnstile (no worthwhile side-effect-free check), Yahoo live quotes.

## Meaning of the fields
- status: ok, degraded (slow, or an external service down), down, not_configured.
- Overall: down if a core service is down; degraded if an external one is down or anything is slow; else ok.
- latencyMs: how long the last check took.
- recentSuccessRatePercent: share of the last up to 20 checks that succeeded.
- requests: 5xx count and rate over the last 15 minutes, from an in-memory counter that ignores health URLs.
- failureCategory: timeout, unreachable, auth_failed, bad_response, not_ready, error, slow.

## What it does NOT guarantee
Not an uptime SLA. Per server instance, resets on restart. A green external service means the last check worked from this server, not that every feature works. It does not test login, payments or data correctness.

## Safety design
Targets come from code and environment, never from the request (no SSRF). Raw error text, hosts and credentials never leave the server; only the fixed category does. Checks are cached, single-flight and throttled. No keys, connection strings or tokens appear in responses (asserted by a test).

## Verification state
Unit tests (16) passed only under a local stand-in for vitest. Integration test written, NOT RUN. UI NOT BUILT or viewed in a browser. See TEST-RESULTS.md.
