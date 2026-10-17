import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import PendingSignup from '../models/PendingSignup.js';
import PendingDeviceLogin from '../models/PendingDeviceLogin.js';
import Session from '../models/Session.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  signMfaLoginToken,
  verifyMfaLoginToken,
} from '../utils/tokens.js';
import { checkEmail, parseEmail, EMAIL_MESSAGES } from '../utils/emailValidation.js';
import { isDisposableDomain } from '../utils/disposableDomains.js';
import { validatePassword, cleanName, isNonEmptyString, NAME_MESSAGE } from '../utils/validators.js';
import { securityLog } from '../utils/securityLog.js';
import { checkCaptcha } from '../middleware/captcha.js';
import { sendMail } from '../utils/mailer.js';
import { signupOtpEmail, deviceLoginEmail } from '../utils/mailTemplates.js';
import { decryptSecret } from '../utils/mfaCrypto.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const REFRESH_COOKIE_NAME = 'vaultrix_refresh';
const MAX_FAILED_LOGINS_TIER1 = 5;
const LOCK_MS_TIER1 = 15 * 60 * 1000;
const MAX_FAILED_LOGINS_TIER2 = 2;
const LOCK_MS_TIER2 = 60 * 60 * 1000;
const MAX_PASSWORD_INPUT = 128;
const DUMMY_HASH = bcrypt.hashSync('vaultrix-timing-guard', 12);

const SIGNUP_OTP_LENGTH = 6;
const SIGNUP_OTP_TTL_MINUTES = 10;
const SIGNUP_OTP_TTL_MS = SIGNUP_OTP_TTL_MINUTES * 60 * 1000;
const SIGNUP_RESEND_COOLDOWN_SECONDS = 60;
const SIGNUP_RESEND_COOLDOWN_MS = SIGNUP_RESEND_COOLDOWN_SECONDS * 1000;
const SIGNUP_MAX_SENDS_PER_HOUR = 5;
const SIGNUP_MAX_ATTEMPTS = 5;
const HOUR_MS = 60 * 60 * 1000;

const MESSAGES = {
  loginRequired: 'Enter your email and password to continue.',
  invalidLogin: 'That email or password is not right.',
  signupRequired: 'Name, email and password are all required.',
  duplicate: 'An account with this email already exists.',
  locked: 'Too many failed sign-in attempts. Please try again later.',
  googleAccount: 'This account was created with Google. Use the Google sign-in button instead.',
  googleUnverified: 'Google sign-in could not be verified.',
  otpWait: 'Please wait a moment before requesting another code.',
  otpHourly: 'Too many code requests. Please try again in an hour.',
  otpWrong: 'That code is not right. Check it and try again.',
  otpExpired: 'That code has expired. Request a new one.',
  otpTooMany: 'Too many wrong codes. Request a new one.',
  signupSessionExpired: 'Your signup session has expired. Please start again.',
};

// A single account can be signed in on this many devices at once. Signing in
// on one more prompts an email code to confirm it's really the owner, then
// signs the least-recently-used device out to make room.
const DEVICE_SESSION_LIMIT = 2;

const maskEmail = (email) => {
  const [local, domain] = String(email).split('@');
  if (!domain) return email;
  const visible = local.slice(0, 2) || local;
  return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 3))}@${domain}`;
};

const generateOtp = () => String(crypto.randomInt(0, 10 ** SIGNUP_OTP_LENGTH)).padStart(SIGNUP_OTP_LENGTH, '0');

const sendOtpInBackground = (message, to) => {
  sendMail({ to, ...message }).catch((error) => {
    console.error('Could not send email:', error.message);
  });
};

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: REFRESH_TOKEN_TTL_MS,
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  plan: user.plan,
  authProvider: user.authProvider,
  currency: user.currency,
  language: user.language,
  country: user.country,
  avatarUrl: user.avatarUrl,
  onboardingCompleted: user.onboardingCompleted,
  mfaEnabled: Boolean(user.mfaEnabled),
});

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const failLocked = (res, lockUntil, lockTier) =>
  res
    .status(429)
    .json({ success: false, message: MESSAGES.locked, lockUntil: lockUntil.toISOString(), lockTier });

const createSession = (req, user) =>
  Session.create({
    userId: user._id,
    userAgent: req.headers['user-agent'] || '',
    ip: req.ip,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

// Sends (or resends, respecting the same cooldown/hourly-cap pattern as
// every other OTP flow in this file) the device-confirmation code, and
// reports what to tell the client.
const sendDeviceOtp = async (req, user) => {
  const now = Date.now();
  const existing = await PendingDeviceLogin.findOne({ userId: user._id });
  const inWindow = Boolean(existing) && now - existing.windowStartedAt.getTime() < HOUR_MS;

  if (existing && now - existing.lastSentAt.getTime() < SIGNUP_RESEND_COOLDOWN_MS) {
    return { blocked: MESSAGES.otpWait };
  }
  if (inWindow && existing.sendCount >= SIGNUP_MAX_SENDS_PER_HOUR) {
    return { blocked: MESSAGES.otpHourly };
  }

  const code = generateOtp();
  const otpHash = await bcrypt.hash(code, 10);

  await PendingDeviceLogin.findOneAndUpdate(
    { userId: user._id },
    {
      $set: {
        otpHash,
        otpExpiresAt: new Date(now + SIGNUP_OTP_TTL_MS),
        attempts: 0,
        userAgent: req.headers['user-agent'] || '',
        ip: req.ip,
        lastSentAt: new Date(now),
        windowStartedAt: inWindow ? existing.windowStartedAt : new Date(now),
        sendCount: inWindow ? existing.sendCount + 1 : 1,
        expiresAt: new Date(now + HOUR_MS),
      },
    },
    { upsert: true }
  );

  sendOtpInBackground(deviceLoginEmail({ name: user.name, code, minutes: SIGNUP_OTP_TTL_MINUTES }), user.email);
  return { ok: true };
};

const startSession = async (req, res, user, status = 200) => {
  const activeDevices = await Session.countDocuments({ userId: user._id });

  if (activeDevices >= DEVICE_SESSION_LIMIT) {
    const outcome = await sendDeviceOtp(req, user);
    if (outcome.blocked) return fail(res, 429, outcome.blocked);

    securityLog('device_limit_challenge', req, { userId: String(user._id) });
    return res.status(200).json({
      success: true,
      requiresDeviceVerification: true,
      maskedEmail: maskEmail(user.email),
      cooldownSeconds: SIGNUP_RESEND_COOLDOWN_SECONDS,
      expiresInMinutes: SIGNUP_OTP_TTL_MINUTES,
    });
  }

  const session = await createSession(req, user);
  const accessToken = signAccessToken(user, session._id);
  const refreshToken = signRefreshToken(user, session._id);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  res.status(status).json({ success: true, accessToken, user: publicUser(user) });
};

// Completes a login that was paused for device verification: confirms the
// emailed code, signs the least-recently-used device out to make room, and
// signs this new device in.
export const verifyDeviceLogin = async (req, res, next) => {
  try {
    const parsed = parseEmail(req.body?.email);
    const code = String(req.body?.code ?? '').trim();

    if (!parsed || !new RegExp(`^\\d{${SIGNUP_OTP_LENGTH}}$`).test(code)) {
      return fail(res, 400, MESSAGES.otpWrong);
    }

    const user = await User.findOne({ email: parsed.email });
    if (!user) return fail(res, 400, MESSAGES.otpWrong);

    const now = new Date();
    const record = await PendingDeviceLogin.findOneAndUpdate(
      { userId: user._id, attempts: { $lt: SIGNUP_MAX_ATTEMPTS }, otpExpiresAt: { $gt: now } },
      { $inc: { attempts: 1 } },
      { new: true }
    );

    if (!record) {
      const stale = await PendingDeviceLogin.findOne({ userId: user._id });
      if (!stale) return fail(res, 400, MESSAGES.otpWrong);
      if (stale.otpExpiresAt <= now) return fail(res, 400, MESSAGES.otpExpired);
      return fail(res, 400, MESSAGES.otpTooMany);
    }

    const matches = await bcrypt.compare(code, record.otpHash);
    if (!matches) {
      securityLog('device_login_wrong_code', req, { userId: String(user._id) });
      return fail(res, 400, record.attempts >= SIGNUP_MAX_ATTEMPTS ? MESSAGES.otpTooMany : MESSAGES.otpWrong);
    }

    // Verified - make room for this device by signing the
    // least-recently-used one out, then let this one in.
    const oldest = await Session.findOne({ userId: user._id }).sort({ lastUsedAt: 1 });
    if (oldest) {
      await Session.deleteOne({ _id: oldest._id });
      securityLog('device_limit_bumped', req, { userId: String(user._id), bumpedSessionId: String(oldest._id) });
    }

    await PendingDeviceLogin.deleteOne({ _id: record._id });

    const session = await createSession(req, user);
    const accessToken = signAccessToken(user, session._id);
    const refreshToken = signRefreshToken(user, session._id);

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
    res.json({ success: true, accessToken, user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

export const signup = async (req, res, next) => {
  try {
    const body = req.body || {};
    const now = Date.now();

    const emailCheck = await checkEmail(body.email);
    if (!emailCheck.ok) {
      securityLog('signup_email_rejected', req, { reason: emailCheck.reason });
      return fail(res, 400, EMAIL_MESSAGES[emailCheck.reason]);
    }

    const email = emailCheck.email;

    const existingUser = await User.findOne({ email });
    if (existingUser) return fail(res, 409, MESSAGES.duplicate);

    const existingPending = await PendingSignup.findOne({ email });
    const isResend = body.resend === true && Boolean(existingPending);

    let name;
    let passwordHash;

    if (isResend) {
      name = existingPending.name;
      passwordHash = existingPending.passwordHash;
    } else {
      if (!isNonEmptyString(body.name) || typeof body.password !== 'string' || !body.password) {
        return fail(res, 400, MESSAGES.signupRequired);
      }

      name = cleanName(body.name);
      if (!name) return fail(res, 400, NAME_MESSAGE);

      const passwordError = validatePassword(body.password, { email, name });
      if (passwordError) return fail(res, 400, passwordError);

      passwordHash = await bcrypt.hash(body.password, 12);
    }

    if (!isResend) {
      const captcha = await checkCaptcha(req);
      if (!captcha.ok) return fail(res, captcha.status, captcha.message);
    }

    const inWindow = Boolean(existingPending) && now - existingPending.windowStartedAt.getTime() < HOUR_MS;

    if (existingPending && now - existingPending.lastSentAt.getTime() < SIGNUP_RESEND_COOLDOWN_MS) {
      return fail(res, 429, MESSAGES.otpWait);
    }

    if (inWindow && existingPending.sendCount >= SIGNUP_MAX_SENDS_PER_HOUR) {
      return fail(res, 429, MESSAGES.otpHourly);
    }

    const code = generateOtp();
    const otpHash = await bcrypt.hash(code, 10);

    await PendingSignup.findOneAndUpdate(
      { email },
      {
        $set: {
          name,
          passwordHash,
          otpHash,
          otpExpiresAt: new Date(now + SIGNUP_OTP_TTL_MS),
          attempts: 0,
          lastSentAt: new Date(now),
          windowStartedAt: inWindow ? existingPending.windowStartedAt : new Date(now),
          sendCount: inWindow ? existingPending.sendCount + 1 : 1,
          expiresAt: new Date(now + HOUR_MS),
        },
      },
      { upsert: true }
    );

    sendOtpInBackground(signupOtpEmail({ name, code, minutes: SIGNUP_OTP_TTL_MINUTES }), email);

    res.json({
      success: true,
      email,
      cooldownSeconds: SIGNUP_RESEND_COOLDOWN_SECONDS,
      expiresInMinutes: SIGNUP_OTP_TTL_MINUTES,
    });
  } catch (error) {
    if (error?.code === 11000) return fail(res, 409, MESSAGES.duplicate);
    next(error);
  }
};

export const verifySignupOtp = async (req, res, next) => {
  let organization = null;

  try {
    const parsed = parseEmail(req.body?.email);
    const code = String(req.body?.code ?? '').trim();

    if (!parsed || !new RegExp(`^\\d{${SIGNUP_OTP_LENGTH}}$`).test(code)) {
      return fail(res, 400, MESSAGES.otpWrong);
    }

    const { email } = parsed;
    const now = new Date();

    const record = await PendingSignup.findOneAndUpdate(
      { email, attempts: { $lt: SIGNUP_MAX_ATTEMPTS }, otpExpiresAt: { $gt: now } },
      { $inc: { attempts: 1 } },
      { new: true }
    );

    if (!record) {
      const stale = await PendingSignup.findOne({ email });
      if (!stale) return fail(res, 400, MESSAGES.signupSessionExpired);
      if (stale.otpExpiresAt <= now) return fail(res, 400, MESSAGES.otpExpired);
      return fail(res, 400, MESSAGES.otpTooMany);
    }

    const matches = await bcrypt.compare(code, record.otpHash);

    if (!matches) {
      securityLog('signup_otp_wrong', req, { email });
      return fail(res, 400, record.attempts >= SIGNUP_MAX_ATTEMPTS ? MESSAGES.otpTooMany : MESSAGES.otpWrong);
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      await PendingSignup.deleteOne({ email });
      return fail(res, 409, MESSAGES.duplicate);
    }

    organization = await Organization.create({ name: `${record.name}'s workspace` });

    const user = await User.create({
      orgId: organization._id,
      name: record.name,
      email,
      passwordHash: record.passwordHash,
      role: 'owner',
    });

    organization.ownerId = user._id;
    await organization.save();

    await PendingSignup.deleteOne({ email });

    await startSession(req, res, user, 201);
  } catch (error) {
    if (organization) {
      Organization.findByIdAndDelete(organization._id).catch(() => {});
    }
    if (error?.code === 11000) return fail(res, 409, MESSAGES.duplicate);
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!isNonEmptyString(email) || typeof password !== 'string' || !password) {
      return fail(res, 400, MESSAGES.loginRequired);
    }

    const parsed = parseEmail(email);
    if (!parsed) return fail(res, 400, EMAIL_MESSAGES.format);

    if (isDisposableDomain(parsed.domain)) {
      securityLog('login_disposable_blocked', req, { domain: parsed.domain });
      return fail(res, 400, EMAIL_MESSAGES.disposable);
    }

    if (password.length > MAX_PASSWORD_INPUT) {
      await bcrypt.compare('x', DUMMY_HASH);
      return fail(res, 401, MESSAGES.invalidLogin);
    }

    const user = await User.findOne({ email: parsed.email });

    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      securityLog('login_unknown_email', req);
      return fail(res, 401, MESSAGES.invalidLogin);
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      securityLog('login_while_locked', req, { userId: String(user._id), tier: user.lockTier || 1 });
      return failLocked(res, user.lockUntil, user.lockTier || 1);
    }

    if (!user.passwordHash) {
      return fail(res, 400, MESSAGES.googleAccount);
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      const updated = await User.findByIdAndUpdate(user._id, { $inc: { failedLoginAttempts: 1 } }, { new: true });

      // The first five wrong attempts earn a 15 minute lock. Once an account has
      // been locked once, it is treated as already warned, so only two more wrong
      // attempts are tolerated before escalating to a one hour lock. It stays at
      // that stricter tier until a successful login resets it.
      const escalated = (updated?.lockTier || 0) >= 1;
      const threshold = escalated ? MAX_FAILED_LOGINS_TIER2 : MAX_FAILED_LOGINS_TIER1;

      if (updated && updated.failedLoginAttempts >= threshold) {
        const nextTier = escalated ? 2 : 1;
        const lockUntil = new Date(Date.now() + (nextTier === 2 ? LOCK_MS_TIER2 : LOCK_MS_TIER1));
        await User.updateOne({ _id: user._id }, { $set: { lockUntil, failedLoginAttempts: 0, lockTier: nextTier } });
        securityLog('account_locked', req, { userId: String(user._id), tier: nextTier });
        return failLocked(res, lockUntil, nextTier);
      }

      securityLog('login_failed', req, { userId: String(user._id) });
      return fail(res, 401, MESSAGES.invalidLogin);
    }

    await User.updateOne(
      { _id: user._id },
      { $set: { failedLoginAttempts: 0, lockUntil: null, lockTier: 0, lastLoginAt: new Date() } }
    );

    if (user.mfaEnabled) {
      const mfaToken = signMfaLoginToken({ sub: String(user._id) });
      securityLog('mfa_challenge', req, { userId: String(user._id) });
      return res.json({ success: true, requiresMfa: true, mfaToken });
    }

    await startSession(req, res, user);
  } catch (error) {
    next(error);
  }
};

// Completes a login that was paused for its 2-step verification code - the
// password already checked out in login(); this just confirms the account
// owner also has the authenticator app (or a backup code), then runs the
// exact same session/device-limit logic a normal login would.
export const verifyMfaLogin = async (req, res, next) => {
  try {
    const { mfaToken, code } = req.body || {};
    if (!mfaToken || !code) return fail(res, 400, MESSAGES.otpWrong);

    let payload;
    try {
      payload = verifyMfaLoginToken(mfaToken);
    } catch (error) {
      return fail(res, 400, 'Your sign-in session has expired. Please sign in again.');
    }

    const user = await User.findById(payload.sub);
    if (!user || !user.mfaEnabled) {
      return fail(res, 400, 'Your sign-in session has expired. Please sign in again.');
    }

    const input = String(code).trim();
    let ok = false;

    if (/^\d{6}$/.test(input)) {
      ok = authenticator.verify({ token: input, secret: decryptSecret(user.mfaSecret) });
    }

    if (!ok) {
      const normalized = input.toUpperCase();
      for (const entry of user.mfaBackupCodes) {
        if (entry.usedAt) continue;
        // eslint-disable-next-line no-await-in-loop
        if (await bcrypt.compare(normalized, entry.codeHash)) {
          entry.usedAt = new Date();
          ok = true;
          break;
        }
      }
      if (ok) await user.save();
    }

    if (!ok) {
      securityLog('mfa_wrong_code', req, { userId: String(user._id) });
      return fail(res, 400, 'That code is not right. Check it and try again.');
    }

    await startSession(req, res, user);
  } catch (error) {
    next(error);
  }
};

export const loginStatus = async (req, res, next) => {
  try {
    const parsed = parseEmail(req.body?.email);
    if (!parsed) return res.json({ success: true, locked: false, lockUntil: null, lockTier: 0 });

    const user = await User.findOne({ email: parsed.email });

    if (!user || !user.lockUntil || user.lockUntil <= new Date()) {
      return res.json({ success: true, locked: false, lockUntil: null, lockTier: 0 });
    }

    res.json({ success: true, locked: true, lockUntil: user.lockUntil.toISOString(), lockTier: user.lockTier || 1 });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];

  // Deletes only this device's Session row, so the refresh token tied to it
  // is immediately invalid (refresh() looks the row up by jti and fails if
  // it's gone) while every other signed-in device stays logged in. Use
  // logoutAllSessions for "log out everywhere".
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await Session.deleteOne({ _id: payload.jti, userId: payload.sub });
    } catch (error) {
      // Token was already invalid or expired - nothing to revoke.
    }
  }

  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
  res.json({ success: true });
};

export const refresh = async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];

  if (!token) {
    return fail(res, 401, 'Please sign in to continue.');
  }

  try {
    const payload = verifyRefreshToken(token);
    const user = await User.findById(payload.sub);

    if (!user || (user.tokenVersion || 0) !== payload.tokenVersion) {
      res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
      return fail(res, 401, 'Please sign in again.');
    }

    // The Session row is the source of truth for whether this specific
    // device is still allowed in - if it was deleted (this device logged
    // out, or revoked from the devices list on another device), refresh
    // fails even though the token itself hasn't expired yet.
    const session = await Session.findOne({ _id: payload.jti, userId: user._id });
    if (!session) {
      res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
      return fail(res, 401, 'Please sign in again.');
    }

    session.lastUsedAt = new Date();
    session.ip = req.ip;
    if (req.headers['user-agent']) session.userAgent = req.headers['user-agent'];
    session.expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    await session.save();

    const accessToken = signAccessToken(user, session._id);
    const refreshToken = signRefreshToken(user, session._id);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
    res.json({ success: true, accessToken, user: publicUser(user) });
  } catch (error) {
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
    fail(res, 401, 'Please sign in again.');
  }
};

export const me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return fail(res, 401, 'Please sign in again.');
    }

    res.json({ success: true, user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

const resolveGoogleUser = async (idToken) => {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();

  if (!payload?.email || payload.email_verified !== true) {
    return null;
  }

  const parsed = parseEmail(payload.email);
  if (!parsed) return null;

  if (isDisposableDomain(parsed.domain)) {
    throw Object.assign(new Error(EMAIL_MESSAGES.disposable), { status: 400 });
  }

  let user = await User.findOne({ email: parsed.email });

  if (!user) {
    const displayName = cleanName(payload.name) || cleanName(parsed.local) || 'Vaultrix user';
    const organization = await Organization.create({ name: `${displayName}'s workspace` });

    user = await User.create({
      orgId: organization._id,
      name: displayName,
      email: parsed.email,
      authProvider: 'google',
      googleId: payload.sub,
      avatarUrl: payload.picture || '',
      role: 'owner',
    });

    organization.ownerId = user._id;
    await organization.save();
  } else if (user.authProvider !== 'google') {
    user.authProvider = 'google';
    user.googleId = payload.sub;
    if (!user.avatarUrl && payload.picture) {
      user.avatarUrl = payload.picture;
    }
    await user.save();
  }

  return user;
};

export const googleAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body || {};

    if (typeof idToken !== 'string' || !idToken) {
      return fail(res, 400, 'Google sign-in did not send back a token.');
    }

    let user;
    try {
      user = await resolveGoogleUser(idToken);
    } catch (error) {
      if (error.status) return fail(res, error.status, error.message);
      securityLog('google_token_rejected', req, { error: error.message });
      return fail(res, 401, MESSAGES.googleUnverified);
    }

    if (!user) {
      return fail(res, 400, 'Could not read your Google account details.');
    }

    await startSession(req, res, user);
  } catch (error) {
    next(error);
  }
};

export const googleCallback = async (req, res) => {
  const clientUrl = String(process.env.CLIENT_URL).split(',')[0].trim().replace(/\/$/, '');
  const failureUrl = `${clientUrl}/login?google_error=1`;
  const successUrl = `${clientUrl}/dashboard`;

  try {
    const { credential, g_csrf_token: bodyToken } = req.body || {};
    const cookieToken = req.cookies?.g_csrf_token;

    if (typeof credential !== 'string' || !credential) {
      return res.redirect(failureUrl);
    }

    if (!cookieToken || !bodyToken || cookieToken !== bodyToken) {
      securityLog('google_csrf_mismatch', req);
      return res.redirect(failureUrl);
    }

    const user = await resolveGoogleUser(credential);

    if (!user) {
      return res.redirect(failureUrl);
    }

    const session = await createSession(req, user);
    const refreshToken = signRefreshToken(user, session._id);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
    res.redirect(successUrl);
  } catch (error) {
    res.redirect(failureUrl);
  }
};
