import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Session from '../models/Session.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/tokens.js';
import { describeDevice } from '../utils/deviceLabel.js';
import { AVATAR_DIR } from '../middleware/upload.js';
import { validatePassword, cleanName, NAME_MESSAGE, isCountryCode, isCurrencyCode } from '../utils/validators.js';

// Must match the dictionaries shipped in frontend/src/i18n/locales.
const APP_LANGUAGES = ['en', 'fr', 'es', 'ar', 'hi', 'ur'];

const REFRESH_COOKIE_NAME = 'vaultrix_refresh';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: REFRESH_TOKEN_TTL_MS,
};

const createSession = (req, user) =>
  Session.create({
    userId: user._id,
    userAgent: req.headers['user-agent'] || '',
    ip: req.ip,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

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

export const updateProfile = async (req, res, next) => {
  try {
    const { name, country, currency, language, completeOnboarding } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Please sign in again.' });
    }

    if (name !== undefined) {
      if (typeof name === 'string' && !name.trim()) {
        return res.status(400).json({ success: false, message: 'Your name cannot be empty.' });
      }
      const cleaned = cleanName(name);
      if (!cleaned) {
        return res.status(400).json({ success: false, message: NAME_MESSAGE });
      }
      user.name = cleaned;
    }

    if (country !== undefined) {
      if (!isCountryCode(country)) {
        return res.status(400).json({ success: false, message: 'That selection is not valid.' });
      }
      user.country = country;
    }

    if (currency !== undefined) {
      if (!isCurrencyCode(currency)) {
        return res.status(400).json({ success: false, message: 'That selection is not valid.' });
      }
      user.currency = currency;
    }

    if (language !== undefined) {
      if (typeof language !== 'string') {
        return res.status(400).json({ success: false, message: 'That language is not supported.' });
      }
      if (!APP_LANGUAGES.includes(language)) {
        return res.status(400).json({ success: false, message: 'That language is not supported.' });
      }
      user.language = language;
    }
    if (completeOnboarding) user.onboardingCompleted = true;

    await user.save();

    res.json({ success: true, user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Enter your current password and a new password.',
      });
    }

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ success: false, message: 'Enter your current password and a new password.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Please sign in again.' });
    }

    const passwordError = validatePassword(newPassword, { email: user.email, name: user.name });
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    if (!user.passwordHash) {
      return res.status(400).json({
        success: false,
        message: 'This account signs in with Google and does not have a password to change.',
      });
    }

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      return res.status(400).json({ success: false, message: 'Your current password is not right.' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    // Changing your password signs every other device out: delete every
    // existing session row, then issue a fresh one for this device only.
    await Session.deleteMany({ userId: user._id });
    const session = await createSession(req, user);

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user, session._id);

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
    res.json({ success: true, accessToken, user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

export const changeAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Choose an image to upload.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Please sign in again.' });
    }

    if (user.avatarUrl && user.avatarUrl.startsWith('/uploads/avatars/')) {
      const previousPath = path.join(AVATAR_DIR, path.basename(user.avatarUrl));
      fs.unlink(previousPath, () => {});
    }

    user.avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await user.save();

    res.json({ success: true, user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

// The current request's own refresh cookie is read (not exposed to the
// frontend otherwise, since it's httpOnly) purely to flag which row in the
// list is "this device" - it is never used to authorize the request itself,
// authenticate() already did that via the Bearer access token.
const currentSessionId = (req) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) return null;
  try {
    return String(verifyRefreshToken(token).jti);
  } catch (error) {
    return null;
  }
};

export const listSessions = async (req, res, next) => {
  try {
    const activeId = currentSessionId(req);
    const sessions = await Session.find({ userId: req.user.id }).sort({ lastUsedAt: -1 }).lean();

    res.json({
      success: true,
      sessions: sessions.map((session) => ({
        id: String(session._id),
        device: describeDevice(session.userAgent),
        ip: session.ip,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
        isCurrent: String(session._id) === activeId,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const revokeSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await Session.deleteOne({ _id: id, userId: req.user.id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'That session is already signed out.' });
    }

    res.json({ success: true });
  } catch (error) {
    // An invalid id shape (not a valid ObjectId) throws a CastError here -
    // treat it the same as "not found" rather than a 500.
    if (error?.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'That session is already signed out.' });
    }
    next(error);
  }
};

export const logoutAllSessions = async (req, res, next) => {
  try {
    await Session.deleteMany({ userId: req.user.id });
    await User.updateOne({ _id: req.user.id }, { $inc: { tokenVersion: 1 } });

    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
