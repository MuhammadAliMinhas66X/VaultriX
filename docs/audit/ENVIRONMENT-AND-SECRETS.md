# ENVIRONMENT-AND-SECRETS

Scope: repository zip, static scan. Values are never printed here.
- Pattern scan (AWS, Google, Stripe, Slack, GitHub, private keys, Mongo URIs with passwords): no matches in source.
- No `.env` files in the zip. `.env.example` files hold placeholders; Turnstile values are Cloudflare's public test keys.
- Frontend reads only `VITE_`-prefixed variables (public by design). No secret found in them.
- No tokens in localStorage or sessionStorage.
- Personal admin email default in source: F-004.
- `.gitignore`, `.gitleaks.toml` and a gitleaks CI job exist; whether they work was not tested.
- NOT VERIFIED: git history (no `.git` in the zip), deployed bundle and source maps, CI secrets, production env.
