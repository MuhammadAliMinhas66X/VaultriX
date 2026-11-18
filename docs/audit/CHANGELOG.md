# Audit changelog

## 2026-11-18 session 1 (HM-1, code only; run the tests before trusting it)
New: `backend/src/services/healthMonitor.js`, `healthProbes.js`, `healthRuntime.js`; `backend/src/controllers/healthController.js`; `frontend/src/components/admin/SystemHealth.jsx`; `frontend/src/utils/healthView.js`; tests `backend/tests/unit/healthMonitor.test.js`, `backend/tests/integration/admin-health.test.js`, `frontend/tests/health-view.test.js`; docs under `docs/audit/`.
Edited (additive, hot files, merge by hand per CLAUDE.md section 8): `backend/src/app.js` (import plus `app.use('/api', requestMetrics.middleware)`), `backend/src/routes/adminRoutes.js` (two routes, import), `backend/src/middleware/rateLimiters.js` (`healthCheckLimiter`), `backend/src/services/exchangeRateService.js` (`getRateTable` now exported), `frontend/src/pages/AdminPage.jsx` (import, icon, one SECTIONS entry), `frontend/src/services/adminService.js` (two functions).
No financial code and no auth code changed.
