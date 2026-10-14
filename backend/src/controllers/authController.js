import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import PendingSignup from '../models/PendingSignup.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/tokens.js';
import { checkEmail, parseEmail, EMAIL_MESSAGES } from '../utils/emailValidation.js';
import { isDisposableDomain } from '../utils/disposableDomains.js';
import { validatePassword, cleanName, isNonEmptyString, NAME_MESSAGE } from '../utils/validators.js';
import { securityLog } from '../utils/securityLog.js';
import { checkCaptcha } from '../middleware/captcha.js';
import { sendMail } from '../utils/mailer.js';
import { signupOtpEmail } from '../utils/mailTemplates.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const REFRESH_COOKIE_NAME = 'vaultrix_refresh';
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
const LOCK_MS = LOCK_MINUTES * 60 * 1000;
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
  locked: `Too many failed sign-in attempts. Please try again in ${LOCK_MINUTES} minutes.`,
  googleAccount: 'This account was created with Google. Use the Google sign-in button instead.',
  googleUnverified: 'Google sign-in could not be verified.',
  otpWait: 'Please wait a moment before requesting another code.',
  otpHourly: 'Too many code requests. Please try again in an hour.',
  otpWrong: 'That code is not right. Check it and try again.',
  otpExpired: 'That code has expired. Request a new one.',
  otpTooMany: 'Too many wrong codes. Request a new one.',
  signupSessionExpired: 'Your signup session has expired. Please start again.',
};

const generateOtp = () => String(crypto.randomInt(0, 10 ** SIGNUP_OTP_LENGTH)).padStart(SIGNUP_OTP_LENGTH, '0');

const sendOtpInBackground = (message, to) => {
  sendMail({ to, ...message }).catch((error) => {
    console.error('Could not send email:', error.message);
  });
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000,
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
});

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const startSession = (res, user, status = 200) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  res.status(status).json({ success: true, accessToken, user: publicUser(user) });
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

    startSession(res, user, 201);
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
      securityLog('login_while_locked', req, { userId: String(user._id) });
      return fail(res, 429, MESSAGES.locked);
    }

    if (!user.passwordHash) {
      return fail(res, 400, MESSAGES.googleAccount);
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      const updated = await User.findByIdAndUpdate(user._id, { $inc: { failedLoginAttempts: 1 } }, { new: true });

      if (updated && updated.failedLoginAttempts >= MAX_FAILED_LOGINS) {
        await User.updateOne(
          { _id: user._id },
          { $set: { lockUntil: new Date(Date.now() + LOCK_MS), failedLoginAttempts: 0 } }
        );
        securityLog('account_locked', req, { userId: String(user._id) });
        return fail(res, 429, MESSAGES.locked);
      }

      securityLog('login_failed', req, { userId: String(user._id) });
      return fail(res, 401, MESSAGES.invalidLogin);
    }

    await User.updateOne(
      { _id: user._id },
      { $set: { failedLoginAttempts: 0, lockUntil: null, lastLoginAt: new Date() } }
    );

    startSession(res, user);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res) => {
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

    startSession(res, user);
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

    startSession(res, user);
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

    const refreshToken = signRefreshToken(user);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
    res.redirect(successUrl);
  } catch (error) {
    res.redirect(failureUrl);
  }
};
