import { isSupportedCurrency } from './currencies.js';

const SPECIAL_CHAR_PATTERN = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/;

export const PASSWORD_MESSAGES = {
  tooShort: 'Password must be more than 8 characters.',
  tooLong: 'Password is too long. Use 64 characters or fewer.',
  needsMix: 'Password must include at least one letter and one special character.',
};

export const NAME_MESSAGE = 'Enter a valid name using letters only.';

// Letters (any script, via \p{L}) and combining marks (accents, via \p{M}), plus
// spaces, apostrophes and hyphens for names like "O'Brien" or "Anne-Marie".
// Must start with a letter - no leading space/punctuation. Digits and symbols
// (!@#$%^&* etc.) are rejected outright.
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} '-]*$/u;

export const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

export const validatePassword = (password) => {
  if (typeof password !== 'string') return PASSWORD_MESSAGES.tooShort;
  if (password.length <= 8) return PASSWORD_MESSAGES.tooShort;
  if (password.length > 64 || Buffer.byteLength(password, 'utf8') > 72) return PASSWORD_MESSAGES.tooLong;
  if (!/\p{L}/u.test(password) || !SPECIAL_CHAR_PATTERN.test(password)) return PASSWORD_MESSAGES.needsMix;

  return null;
};

export const cleanName = (raw) => {
  if (typeof raw !== 'string') return null;
  const value = raw.replace(/\s+/g, ' ').trim();
  if (value.length < 2 || value.length > 60) return null;
  if (!NAME_PATTERN.test(value)) return null;
  return value;
};

export const isCountryCode = (value) => typeof value === 'string' && /^[A-Z]{2}$/.test(value);
export const isCurrencyCode = (value) => isSupportedCurrency(value);

// Free-text labels (account names, category names) - looser than cleanName
// above, which is letters-only and meant for a person's own name. "Chase
// Checking", "Food & Dining", "401(k)" all need to be valid here.
const LABEL_PATTERN = /^[\p{L}\p{N}][\p{L}\p{M}\p{N} .,&'()/-]*$/u;

export const cleanLabel = (raw) => {
  if (typeof raw !== 'string') return null;
  const value = raw.replace(/\s+/g, ' ').trim();
  if (value.length < 1 || value.length > 60) return null;
  if (!LABEL_PATTERN.test(value)) return null;
  return value;
};

export const isHexColor = (value) => typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);

// Open free text (income stream "detail", a custom bank/wallet name
// typed under "Other", and anything similar later) - looser again than
// cleanLabel above, which requires the text to START with a letter or
// digit. That rule is right for a primary name (an account, a category)
// but wrong for a detail someone is describing in their own words -
// ".NET Web Developer", "50% remote", "(night shift)" are all reasonable
// things to type here and were being rejected by cleanLabel's first-char
// rule. This only trims, caps the length, and blocks control characters -
// nothing about the first character.
const CONTROL_CHAR_PATTERN = /[\u0000-\u001f\u007f]/;

export const cleanFreeText = (raw, maxLength = 120) => {
  if (typeof raw !== 'string') return null;
  const value = raw.replace(/\s+/g, ' ').trim();
  if (value.length > maxLength) return null;
  if (CONTROL_CHAR_PATTERN.test(value)) return null;
  return value;
};
