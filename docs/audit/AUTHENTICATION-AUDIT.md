# AUTHENTICATION-AUDIT (partial, code reading)

Read: login, MFA login, login status, logout, refresh, signup OTP, password reset, cookie options, rate limiters, admin gate.

Held up: bcrypt hashing; lockout counter; atomic OTP attempt cap; single-use reset nonce and `tokenVersion` bump; refresh rotation with replay detection; role loaded from the database on every request; Origin guard on unsafe methods; HttpOnly refresh cookie with SameSite lax.

Weak: F-001, F-002, F-003, F-008, F-009, F-010.

NOT VERIFIED (not read or not run): device-login flow, Google callback and account linking, email change, account deletion, session listing and revocation, every dynamic test in the assignment list (items 1 to 20).
