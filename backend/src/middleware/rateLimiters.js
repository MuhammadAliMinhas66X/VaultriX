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

// Limits are counted per signed-in person, not per IP address, wherever the
// route is behind authenticate. Many people share one IP (mobile carriers,
// offices, schools), so counting by IP made strangers use up each other's
// allowance. Routes with no signed-in user (login, signup, codes) still
// count by IP.
const userKey = (req) => (req.user && req.user.id ? `user:${req.user.id}` : req.ip);

const build = (windowMs, max, extra = {}) =>
  rateLimit({
    windowMs,
    max: isProduction ? max : max * DEV_MULTIPLIER,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many attempts. Please wait a moment and try again.' },
    ...extra,
  });

export const loginLimiter = build(15 * 60 * 1000, 300, { skipSuccessfulRequests: true });
export const signupLimiter = build(60 * 60 * 1000, 200);
export const googleLimiter = build(15 * 60 * 1000, 1000);
export const refreshLimiter = build(15 * 60 * 1000, 5000);
export const forgotLimiter = build(60 * 60 * 1000, 100);
export const verifyCodeLimiter = build(15 * 60 * 1000, 1000);
export const resetLimiter = build(15 * 60 * 1000, 300);
export const emailCheckLimiter = build(5 * 60 * 1000, 3000);
export const passwordChangeLimiter = build(15 * 60 * 1000, 200, { keyGenerator: userKey });
export const loginStatusLimiter = build(5 * 60 * 1000, 3000);
export const sessionsLimiter = build(15 * 60 * 1000, 5000, { keyGenerator: userKey });
export const emailChangeLimiter = build(15 * 60 * 1000, 100, { keyGenerator: userKey });
export const accountDeleteLimiter = build(60 * 60 * 1000, 20, { keyGenerator: userKey });
export const mfaLimiter = build(15 * 60 * 1000, 200);
export const securityEventLimiter = build(5 * 60 * 1000, 200, { keyGenerator: userKey });

// Flood guard only. Real flood protection belongs at Cloudflare (see
// docs/CLOUDFLARE-SETUP.md); the admin area has no limit by design.
export const apiLimiter = build(15 * 60 * 1000, 100000, { skip: (req) => req.originalUrl.startsWith('/api/admin') });

// Brute force protection for the admin password check. Not a volume limit.
export const stepUpLimiter = build(15 * 60 * 1000, 10, { skipSuccessfulRequests: true, keyGenerator: userKey });

export const financeLimiter = build(15 * 60 * 1000, 20000, { keyGenerator: userKey });
export const uploadLimiter = build(15 * 60 * 1000, 1000, { keyGenerator: userKey });
export const fxLimiter = build(15 * 60 * 1000, 20000, { keyGenerator: userKey });
