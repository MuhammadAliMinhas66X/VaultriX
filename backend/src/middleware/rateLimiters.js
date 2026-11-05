import rateLimit from 'express-rate-limit';

const isProduction = process.env.NODE_ENV === 'production';

// Outside production (local dev, the e2e suite, manual QA against a dev
// server) these ceilings stay real enough to actually test "you've been
// rate limited" UI paths, but get a much higher roof so ordinary dev work
// - signing up a handful of test accounts in a row, retrying a login,
// poking the admin dashboard with throwaway accounts - doesn't eat into
// the SAME limit a production deployment relies on for abuse protection.
// Production behavior is completely unchanged.
const DEV_MULTIPLIER = 20;

const build = (windowMs, max, extra = {}) =>
  rateLimit({
    windowMs,
    max: isProduction ? max : max * DEV_MULTIPLIER,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many attempts. Please wait a moment and try again.' },
    ...extra,
  });

export const loginLimiter = build(15 * 60 * 1000, 10, { skipSuccessfulRequests: true });
export const signupLimiter = build(60 * 60 * 1000, 10);
export const googleLimiter = build(15 * 60 * 1000, 40);
export const refreshLimiter = build(15 * 60 * 1000, 120);
export const forgotLimiter = build(60 * 60 * 1000, 15);
export const verifyCodeLimiter = build(15 * 60 * 1000, 30);
export const resetLimiter = build(15 * 60 * 1000, 15);
export const emailCheckLimiter = build(5 * 60 * 1000, 80);
export const passwordChangeLimiter = build(15 * 60 * 1000, 10);
export const loginStatusLimiter = build(5 * 60 * 1000, 60);
export const sessionsLimiter = build(15 * 60 * 1000, 60);
export const emailChangeLimiter = build(15 * 60 * 1000, 20);
export const accountDeleteLimiter = build(60 * 60 * 1000, 10);
export const mfaLimiter = build(15 * 60 * 1000, 20);
export const securityEventLimiter = build(5 * 60 * 1000, 40);
export const apiLimiter = build(15 * 60 * 1000, 1500, { skip: (req) => req.originalUrl.startsWith('/api/admin') });
export const stepUpLimiter = build(15 * 60 * 1000, 10, { skipSuccessfulRequests: true });
// Accounts/Categories writes - ordinary product usage (adding a few
// accounts, editing one) shouldn't come close to this; it's here purely
// to match the rest of the app's "every mutation is rate limited" posture.
export const financeLimiter = build(15 * 60 * 1000, 120);
export const uploadLimiter = build(15 * 60 * 1000, 40);
export const fxLimiter = build(15 * 60 * 1000, 300);
