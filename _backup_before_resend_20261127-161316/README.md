# Vaultrix

Enterprise personal finance tracker. React frontend, Node/Express backend, MongoDB Atlas.

## Structure

```
vaultrix/
  backend/     Express API, MongoDB models, auth, business logic
  frontend/    React app
```

## Modules planned

1. Auth and user management
2. Core transactions
3. Accounts
4. Budgeting and goals
5. Loans (no interest)
6. Rental management
7. Bill management
8. Group and shared expense splitting
9. Committees and ROSCA
10. Salary and tax calculator
11. Notifications and feedback
12. Internationalization
13. Reports and dashboard
14. Admin dashboard
15. Security hardening
16. Design system

Screens are built one at a time. Design comes first, then implementation, then the next screen is prompted for separately.

## Setup

Backend:

```
cd backend
cp .env.example .env
npm install
npm run dev
```

Frontend:

```
cd frontend
npm install
npm start
```

## Technology stack

React (Vite, Tailwind) frontend; Node/Express backend; MongoDB (Mongoose); JWT access tokens plus an HttpOnly refresh cookie; Cloudinary for private images; SMTP email; six languages (English, French, Spanish, Arabic, Hindi, Urdu). Tests use vitest (and supertest on the backend).

## Commands

Backend: `npm run dev`, `npm test`. Frontend: `npm run dev`, `npm test`, `npm run build`. Never commit `.env` files; copy `.env.example` and fill values locally.

## Security and health monitoring

Security practices and the open audit findings are in `docs/audit/`. Admins can see service health under Admin, System health (`GET /api/admin/health`, admin only). The public `GET /api/health` is a liveness check only. See `docs/audit/API-HEALTH-MONITORING.md`.

## Documentation

- `CLAUDE.md`: operating manual for Claude agents.
- `docs/audit/README.md`: audit index, findings, roadmap, session handoff.
- `docs/APP-MAP.md`: map of the app.

## Git workflow

Each feature gets its own commit (and ideally its own branch merged via PR) so history stays traceable feature by feature.
