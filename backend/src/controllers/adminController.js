import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Session from '../models/Session.js';
import SecurityEvent from '../models/SecurityEvent.js';
import PasswordReset from '../models/PasswordReset.js';
import PendingEmailChange from '../models/PendingEmailChange.js';
import PendingDeviceLogin from '../models/PendingDeviceLogin.js';
import PendingAccountDeletion from '../models/PendingAccountDeletion.js';
import { describeDevice } from '../utils/deviceLabel.js';
import { cooldownLockedUntilIso, googleLinkLockedUntilIso } from '../utils/cooldown.js';
import { isCountryCode, isCurrencyCode, cleanName, NAME_MESSAGE } from '../utils/validators.js';
import { parseEmail, EMAIL_MESSAGES } from '../utils/emailValidation.js';
import { sendMail } from '../utils/mailer.js';
import {
  otpEmail,
  accountDeactivatedEmail,
  accountReactivatedEmail,
  mfaDisabledByAdminEmail,
  emailChangedEmail,
} from '../utils/mailTemplates.js';
import { securityLog } from '../utils/securityLog.js';
import { ADMIN_EMAIL } from '../config/env.js';
import { removeOrganizationIfEmpty } from '../utils/organizations.js';

// Must match frontend/src/i18n/locales.
const APP_LANGUAGES = ['en', 'fr', 'es', 'ar', 'hi', 'ur'];

// "Online" is approximated as "has a session whose refresh token was used
// in the last N minutes" - there's no separate presence/heartbeat system,
// this just reuses the Session.lastUsedAt that already gets bumped on every
// authenticated request (see tokens.js / the refresh flow).
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

const sendInBackground = (message, to) => {
  sendMail({ to, ...message }).catch((error) => {
    console.error('Could not send email:', error.message);
  });
};

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const notFound = (res) => fail(res, 404, 'That account could not be found.');

// Deliberately excludes passwordHash, mfaSecret, mfaBackupCodes - the admin
// panel can act on those (disable MFA, force a reset) without ever needing
// to read them.
const isLocked = (user) => Boolean(user.lockUntil && new Date(user.lockUntil).getTime() > Date.now());

const adminUserSummary = (user, onlineUserIds) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  authProvider: user.authProvider,
  googleLinked: Boolean(user.googleId),
  role: user.role,
  plan: user.plan,
  country: user.country,
  currency: user.currency,
  language: user.language,
  avatarUrl: user.avatarUrl,
  onboardingCompleted: user.onboardingCompleted,
  mfaEnabled: Boolean(user.mfaEnabled),
  hasPassword: Boolean(user.passwordHash),
  isActive: user.isActive !== false,
  deactivatedAt: user.deactivatedAt,
  deactivatedBy: user.deactivatedBy,
  isOnline: onlineUserIds.has(String(user._id)),
  isLocked: isLocked(user),
  lockUntil: user.lockUntil,
  failedLoginAttempts: user.failedLoginAttempts || 0,
  adminNotes: user.adminNotes || '',
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
});

const getOnlineUserIds = async (userIds) => {
  const since = new Date(Date.now() - ONLINE_WINDOW_MS);
  const filter = { lastUsedAt: { $gte: since } };
  if (userIds) filter.userId = { $in: userIds };
  const sessions = await Session.find(filter).select('userId').lean();
  return new Set(sessions.map((s) => String(s.userId)));
};

// --- Overview -------------------------------------------------------------

const SIGNUP_TREND_DAYS = 14;

// Mongo's aggregation only returns days that actually had a signup - this
// fills in the gaps with 0s so the chart has one point per day, not gaps
// that would look like missing data.
const fillDailySeries = (rows, days) => {
  const byDay = new Map(rows.map((r) => [r._id, r.count]));
  const series = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    series.push({ date: key, count: byDay.get(key) || 0 });
  }
  return series;
};

export const getOverview = async (req, res, next) => {
  try {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const trendStart = new Date(Date.now() - SIGNUP_TREND_DAYS * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      deactivatedUsers,
      lockedUsers,
      signupsToday,
      signupsThisWeek,
      onlineUserIds,
      recentSignups,
      signupTrendRaw,
      providerBreakdownRaw,
      planBreakdownRaw,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isActive: false }),
      User.countDocuments({ lockUntil: { $gt: new Date() } }),
      User.countDocuments({ createdAt: { $gte: dayAgo } }),
      User.countDocuments({ createdAt: { $gte: weekAgo } }),
      getOnlineUserIds(),
      User.find({}).sort({ createdAt: -1 }).limit(8).select('name email authProvider createdAt').lean(),
      User.aggregate([
        { $match: { createdAt: { $gte: trendStart } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      ]),
      User.aggregate([{ $group: { _id: '$authProvider', count: { $sum: 1 } } }]),
      User.aggregate([{ $group: { _id: '$plan', count: { $sum: 1 } } }]),
    ]);

    const providerBreakdown = { password: 0, google: 0 };
    providerBreakdownRaw.forEach((row) => {
      providerBreakdown[row._id === 'google' ? 'google' : 'password'] += row.count;
    });

    const planBreakdown = { standard: 0, premium: 0 };
    planBreakdownRaw.forEach((row) => {
      if (row._id === 'premium') planBreakdown.premium += row.count;
      else planBreakdown.standard += row.count;
    });

    res.json({
      success: true,
      overview: {
        totalUsers,
        activeUsers: totalUsers - deactivatedUsers,
        deactivatedUsers,
        lockedUsers,
        onlineNow: onlineUserIds.size,
        signupsToday,
        signupsThisWeek,
      },
      signupTrend: fillDailySeries(signupTrendRaw, SIGNUP_TREND_DAYS),
      providerBreakdown,
      planBreakdown,
      recentSignups: recentSignups.map((u) => ({
        id: String(u._id),
        name: u.name,
        email: u.email,
        authProvider: u.authProvider,
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// --- Users list -------------------------------------------------------------

const PAGE_SIZE = 25;

export const listUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || 'all'); // all | active | deactivated | online

    const filter = {};
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ name: new RegExp(escaped, 'i') }, { email: new RegExp(escaped, 'i') }];
    }
    if (status === 'active') filter.isActive = { $ne: false };
    if (status === 'deactivated') filter.isActive = false;

    let onlineUserIds = new Set();
    if (status === 'online') {
      onlineUserIds = await getOnlineUserIds();
      filter._id = { $in: Array.from(onlineUserIds) };
    }

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
    ]);

    if (status !== 'online') {
      onlineUserIds = await getOnlineUserIds(users.map((u) => u._id));
    }

    res.json({
      success: true,
      users: users.map((u) => adminUserSummary(u, onlineUserIds)),
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  } catch (error) {
    next(error);
  }
};

// --- Single user: full detail -------------------------------------------------------------

export const getUserDetail = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return notFound(res);

    const [sessions, events, onlineUserIds] = await Promise.all([
      Session.find({ userId: user._id }).sort({ lastUsedAt: -1 }).lean(),
      SecurityEvent.find({ userId: user._id }).sort({ createdAt: -1 }).limit(50).lean(),
      getOnlineUserIds([user._id]),
    ]);

    res.json({
      success: true,
      user: {
        ...adminUserSummary(user, onlineUserIds),
        nameHistory: (user.nameHistory || []).slice(-10).reverse(),
        emailHistory: (user.emailHistory || []).slice(-10).reverse(),
        emailLockedUntil: cooldownLockedUntilIso(user.emailChangedAt),
        usernameLockedUntil: cooldownLockedUntilIso(user.usernameChangedAt),
        googleLinkLockedUntil: googleLinkLockedUntilIso(user.googleUnlinkedAt),
      },
      sessions: sessions.map((session) => ({
        id: String(session._id),
        device: describeDevice(session.userAgent),
        ip: session.ip,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
      })),
      events: events.map((event) => ({
        id: String(event._id),
        event: event.event,
        ip: event.ip,
        path: event.path,
        details: event.details,
        createdAt: event.createdAt,
      })),
    });
  } catch (error) {
    if (error?.name === 'CastError') return notFound(res);
    next(error);
  }
};

// --- Admin edits a user's own-editable fields -------------------------------------------------------------

export const updateUserAsAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return notFound(res);

    const { name, email, country, currency, language, role, plan, onboardingCompleted, adminNotes } = req.body || {};
    const update = {};
    let emailChangedTo = null;
    let previousEmail = null;

    if (name !== undefined) {
      const cleaned = cleanName(name);
      if (!cleaned) return fail(res, 400, NAME_MESSAGE);
      update.name = cleaned;
    }
    if (email !== undefined) {
      // Admin sets the email directly - no OTP round trip, unlike the
      // user's own self-service email change (requestEmailChange /
      // verifyEmailChange in userController.js). Still runs the same
      // parsing/uniqueness checks and leaves the same emailHistory trail
      // and notice email to the OLD address, so the account's own audit
      // trail doesn't have a gap just because an admin made this change.
      //
      // Parsed BEFORE comparing against the stored email - emails are
      // stored lowercase, so comparing the raw, possibly-mixed-case input
      // against it directly would treat "Foo@Example.com" as a change
      // from "foo@example.com" and send a pointless notice email.
      const parsed = parseEmail(email);
      if (!parsed) return fail(res, 400, EMAIL_MESSAGES.format);
      if (parsed.email !== user.email) {
        const taken = await User.findOne({ email: parsed.email, _id: { $ne: user._id } });
        if (taken) return fail(res, 400, 'An account with this email already exists.');
        previousEmail = user.email;
        emailChangedTo = parsed.email;
        update.email = parsed.email;
        update.emailChangedAt = new Date();
        update.emailHistory = [...(user.emailHistory || []), { value: previousEmail, changedAt: new Date() }].slice(-20);
      }
    }
    if (onboardingCompleted !== undefined) {
      update.onboardingCompleted = Boolean(onboardingCompleted);
    }
    if (adminNotes !== undefined) {
      update.adminNotes = String(adminNotes).slice(0, 4000);
    }
    if (country !== undefined) {
      if (country !== '' && !isCountryCode(country)) return fail(res, 400, 'That is not a valid country.');
      update.country = country || undefined;
    }
    if (currency !== undefined) {
      if (currency !== '' && !isCurrencyCode(currency)) return fail(res, 400, 'That is not a valid currency.');
      update.currency = currency || undefined;
    }
    if (language !== undefined) {
      if (!APP_LANGUAGES.includes(language)) return fail(res, 400, 'That is not a supported language.');
      update.language = language;
    }
    if (role !== undefined) {
      if (!['owner', 'admin', 'member', 'viewer'].includes(role)) return fail(res, 400, 'That is not a valid role.');
      update.role = role;
    }
    if (plan !== undefined) {
      if (!['standard', 'premium'].includes(plan)) return fail(res, 400, 'That is not a valid plan.');
      update.plan = plan;
    }

    Object.assign(user, update);
    await user.save();

    if (emailChangedTo) {
      // Notice goes to the OLD address, same as the self-service flow in
      // userController.js's verifyEmailChange - whoever still has that
      // inbox finds out immediately, even though this change didn't go
      // through their own OTP step.
      sendInBackground(emailChangedEmail({ name: user.name, newEmail: emailChangedTo }), previousEmail);
    }

    securityLog('admin_user_updated', req, { adminEmail: ADMIN_EMAIL, userId: String(user._id), fields: Object.keys(update) });

    const onlineUserIds = await getOnlineUserIds([user._id]);
    res.json({ success: true, user: adminUserSummary(user.toObject(), onlineUserIds) });
  } catch (error) {
    if (error?.name === 'CastError') return notFound(res);
    next(error);
  }
};

// --- Deactivate / reactivate -------------------------------------------------------------

export const deactivateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return notFound(res);
    if (user.email === ADMIN_EMAIL) return fail(res, 400, "You can't deactivate the admin account.");

    user.isActive = false;
    user.deactivatedAt = new Date();
    user.deactivatedBy = ADMIN_EMAIL;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await Session.deleteMany({ userId: user._id });

    sendInBackground(accountDeactivatedEmail({ name: user.name }), user.email);
    securityLog('admin_user_deactivated', req, { adminEmail: ADMIN_EMAIL, userId: String(user._id) });

    const onlineUserIds = await getOnlineUserIds([user._id]);
    res.json({ success: true, user: adminUserSummary(user.toObject(), onlineUserIds) });
  } catch (error) {
    if (error?.name === 'CastError') return notFound(res);
    next(error);
  }
};

export const reactivateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return notFound(res);

    user.isActive = true;
    user.deactivatedAt = null;
    user.deactivatedBy = null;
    await user.save();

    sendInBackground(accountReactivatedEmail({ name: user.name }), user.email);
    securityLog('admin_user_reactivated', req, { adminEmail: ADMIN_EMAIL, userId: String(user._id) });

    const onlineUserIds = await getOnlineUserIds([user._id]);
    res.json({ success: true, user: adminUserSummary(user.toObject(), onlineUserIds) });
  } catch (error) {
    if (error?.name === 'CastError') return notFound(res);
    next(error);
  }
};

// --- Permanent delete -------------------------------------------------------------
// Same cleanup as the user's own confirmAccountDeletion() in
// userController.js, minus the emailed-OTP step - an admin acting here has
// already authenticated as the one trusted operator account, so that
// second confirmation (which exists to stop someone at an unlocked,
// already-signed-in browser) doesn't apply the same way.

export const deleteUserAsAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return notFound(res);
    if (user.email === ADMIN_EMAIL) return fail(res, 400, "You can't delete the admin account.");

    const userId = user._id;

    await Promise.all([
      Session.deleteMany({ userId }),
      PendingEmailChange.deleteMany({ userId }),
      PendingDeviceLogin.deleteMany({ userId }),
      PendingAccountDeletion.deleteOne({ userId }),
      PasswordReset.deleteMany({ userId }),
    ]);

    await User.deleteOne({ _id: userId });
    await removeOrganizationIfEmpty(user.orgId);

    securityLog('admin_user_deleted', req, { adminEmail: ADMIN_EMAIL, userId: String(userId), email: user.email });

    res.json({ success: true });
  } catch (error) {
    if (error?.name === 'CastError') return notFound(res);
    next(error);
  }
};

// --- Force password reset -------------------------------------------------------------
// Reuses the exact same PasswordReset/OTP mechanism as self-service "forgot
// password" (see passwordResetController.js) - the user still picks their
// own new password by entering the emailed code on /forgot-password, an
// admin never sees or sets a password directly.

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10;
const generateCode = () => String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');

export const forcePasswordReset = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return notFound(res);
    if (!user.passwordHash) {
      return fail(res, 400, 'This account signs in with Google and has no password to reset.');
    }

    const code = generateCode();
    const otpHash = await bcrypt.hash(code, 10);
    const now = Date.now();

    await PasswordReset.findOneAndUpdate(
      { email: user.email },
      {
        $set: {
          userId: user._id,
          otpHash,
          otpExpiresAt: new Date(now + OTP_TTL_MINUTES * 60 * 1000),
          attempts: 0,
          verified: false,
          resetNonce: null,
          resetExpiresAt: null,
          lastSentAt: new Date(now),
          windowStartedAt: new Date(now),
          sendCount: 1,
          expiresAt: new Date(now + 60 * 60 * 1000),
        },
      },
      { upsert: true }
    );

    sendInBackground(otpEmail({ name: user.name, code, minutes: OTP_TTL_MINUTES }), user.email);
    securityLog('admin_forced_password_reset', req, { adminEmail: ADMIN_EMAIL, userId: String(user._id) });

    res.json({ success: true, expiresInMinutes: OTP_TTL_MINUTES });
  } catch (error) {
    if (error?.name === 'CastError') return notFound(res);
    next(error);
  }
};

// --- Unlock a login-rate-limited account -------------------------------------------------------------
// Separate from deactivate/reactivate: this clears the automatic lockout
// that authController's own failed-login counter applies (see lockUntil /
// lockTier / failedLoginAttempts on the User model) - for when someone
// locks themselves out and doesn't want to wait out the timer.

export const unlockUserAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return notFound(res);
    if (!isLocked(user)) return fail(res, 400, 'This account is not currently locked out.');

    user.lockUntil = null;
    user.lockTier = 0;
    user.failedLoginAttempts = 0;
    await user.save();

    securityLog('admin_unlocked_account', req, { adminEmail: ADMIN_EMAIL, userId: String(user._id) });

    const onlineUserIds = await getOnlineUserIds([user._id]);
    res.json({ success: true, user: adminUserSummary(user.toObject(), onlineUserIds) });
  } catch (error) {
    if (error?.name === 'CastError') return notFound(res);
    next(error);
  }
};

// --- Security overview -------------------------------------------------------------
// A focused view of the same SecurityEvent collection the general audit
// log reads from, filtered to the events that actually mean "something is
// going wrong with sign-in" - plus the accounts currently locked out,
// which the audit log alone doesn't surface as a standing list.

const SECURITY_EVENT_TYPES = ['login_failed', 'account_locked', 'login_while_locked', 'login_unknown_email', 'mfa_wrong_code', 'client_capture_key', 'client_print_attempt', 'client_save_attempt', 'client_fullscreen_exit', 'origin_blocked', 'admin_stepup_failed', 'refresh_reuse'];

export const getSecurityOverview = async (req, res, next) => {
  try {
    const [lockedUsers, recentEvents, failedLoginsToday] = await Promise.all([
      User.find({ lockUntil: { $gt: new Date() } })
        .sort({ lockUntil: -1 })
        .select('name email lockUntil lockTier failedLoginAttempts')
        .lean(),
      SecurityEvent.find({ event: { $in: SECURITY_EVENT_TYPES } })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      SecurityEvent.countDocuments({
        event: { $in: SECURITY_EVENT_TYPES },
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
    ]);

    const userIds = recentEvents.map((e) => e.userId).filter(Boolean);
    const users = await User.find({ _id: { $in: userIds } }).select('name email').lean();
    const userMap = new Map(users.map((u) => [String(u._id), u]));

    res.json({
      success: true,
      failedLoginsToday,
      lockedAccounts: lockedUsers.map((u) => ({
        id: String(u._id),
        name: u.name,
        email: u.email,
        lockUntil: u.lockUntil,
        lockTier: u.lockTier,
        failedLoginAttempts: u.failedLoginAttempts,
      })),
      events: recentEvents.map((event) => {
        const user = event.userId ? userMap.get(String(event.userId)) : null;
        return {
          id: String(event._id),
          event: event.event,
          userId: event.userId ? String(event.userId) : null,
          userName: user?.name || null,
          userEmail: user?.email || null,
          ip: event.ip,
          createdAt: event.createdAt,
        };
      }),
    });
  } catch (error) {
    next(error);
  }
};

// --- CSV export -------------------------------------------------------------

const CSV_EXPORT_LIMIT = 5000;

const csvCell = (value) => {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const CSV_COLUMNS = [
  'id',
  'name',
  'email',
  'authProvider',
  'role',
  'plan',
  'country',
  'currency',
  'language',
  'isActive',
  'mfaEnabled',
  'onboardingCompleted',
  'createdAt',
  'lastLoginAt',
];

export const exportUsersCsv = async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || 'all');

    const filter = {};
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ name: new RegExp(escaped, 'i') }, { email: new RegExp(escaped, 'i') }];
    }
    if (status === 'active') filter.isActive = { $ne: false };
    if (status === 'deactivated') filter.isActive = false;

    const users = await User.find(filter).sort({ createdAt: -1 }).limit(CSV_EXPORT_LIMIT).lean();

    const lines = [CSV_COLUMNS.join(',')];
    users.forEach((u) => {
      lines.push(
        CSV_COLUMNS.map((col) =>
          csvCell(
            col === 'id'
              ? String(u._id)
              : col === 'createdAt' || col === 'lastLoginAt'
                ? u[col]
                  ? new Date(u[col]).toISOString()
                  : ''
                : u[col]
          )
        ).join(',')
      );
    });

    securityLog('admin_users_exported', req, { adminEmail: ADMIN_EMAIL, count: users.length });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="vaultrix-users-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(lines.join('\n'));
  } catch (error) {
    next(error);
  }
};

// --- Disable MFA (account-recovery path for a lost authenticator) -------------------------------------------------------------

export const disableUserMfa = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return notFound(res);
    if (!user.mfaEnabled) return fail(res, 400, '2-step verification is already off for this account.');

    user.mfaEnabled = false;
    user.mfaSecret = undefined;
    user.mfaBackupCodes = [];
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await Session.deleteMany({ userId: user._id });

    sendInBackground(mfaDisabledByAdminEmail({ name: user.name }), user.email);
    securityLog('admin_mfa_disabled', req, { adminEmail: ADMIN_EMAIL, userId: String(user._id) });

    const onlineUserIds = await getOnlineUserIds([user._id]);
    res.json({ success: true, user: adminUserSummary(user.toObject(), onlineUserIds) });
  } catch (error) {
    if (error?.name === 'CastError') return notFound(res);
    next(error);
  }
};

// --- Sessions -------------------------------------------------------------

export const revokeUserSession = async (req, res, next) => {
  try {
    const { id, sessionId } = req.params;
    const result = await Session.deleteOne({ _id: sessionId, userId: id });
    if (result.deletedCount === 0) return fail(res, 404, 'That session could not be found.');

    securityLog('admin_session_revoked', req, { adminEmail: ADMIN_EMAIL, userId: id, sessionId });
    res.json({ success: true });
  } catch (error) {
    if (error?.name === 'CastError') return fail(res, 404, 'That session could not be found.');
    next(error);
  }
};

// --- Signup / security audit log -------------------------------------------------------------

export const getAuditLog = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const eventFilter = String(req.query.event || '').trim();

    const filter = {};
    if (eventFilter) filter.event = eventFilter;

    const [total, events, distinctEvents] = await Promise.all([
      SecurityEvent.countDocuments(filter),
      SecurityEvent.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
      SecurityEvent.distinct('event'),
    ]);

    res.json({
      success: true,
      events: events.map((event) => ({
        id: String(event._id),
        event: event.event,
        userId: event.userId ? String(event.userId) : null,
        ip: event.ip,
        path: event.path,
        details: event.details,
        createdAt: event.createdAt,
      })),
      eventTypes: distinctEvents.sort(),
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  } catch (error) {
    next(error);
  }
};
