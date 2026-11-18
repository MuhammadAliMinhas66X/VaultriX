# DEPENDENCY-AUDIT

Status: IN PROGRESS. Only the summary line from the owner's `npm install` in `backend/` exists.

- Latest summary: 10 vulnerabilities (6 moderate, 4 high). An earlier install in the same session reported 18 (5 moderate, 13 high); the difference is not explained (lockfile change or a different resolution). Treat the lower number as current only after re-running.
- The sandbox cannot reach the registry, so the package names and advisories are NOT VERIFIED.
- `mongodb-memory-server` has an install script not yet covered by `allowScripts` (npm warning). It is a dev dependency used by tests; approve it deliberately with `npm install-scripts approve mongodb-memory-server` if tests need its download.
- Frontend: not yet run.

Next step (task DEP-1): on the owner's PC run `npm audit --omit=dev` and `npm audit` in `backend/` and `frontend/`, paste the package names and severities here (no secrets involved), then decide upgrades one at a time. Do not run `npm audit fix --force` blindly: it can make breaking upgrades (for example multer 1.x to 2.x changes the upload code path).
