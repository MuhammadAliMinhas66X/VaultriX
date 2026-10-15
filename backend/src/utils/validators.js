const SPECIAL_CHAR_PATTERN = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/;

export const PASSWORD_MESSAGES = {
  tooShort: 'Password must be more than 8 characters.',
  tooLong: 'Password is too long. Use 64 characters or fewer.',
  needsMix: 'Password must include at least one letter and one special character.',
};

export const NAME_MESSAGE = 'Enter a valid name between 2 and 60 characters.';

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
  if (/[<>{}[\]\\/$`\u0000-\u001f\u007f]/u.test(value)) return null;
  return value;
};

export const isCountryCode = (value) => typeof value === 'string' && /^[A-Z]{2}$/.test(value);
export const isCurrencyCode = (value) => typeof value === 'string' && /^[A-Z]{3}$/.test(value);
