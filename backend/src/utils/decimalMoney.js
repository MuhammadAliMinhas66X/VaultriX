export const LOAN_DECIMALS = 4;
export const LOAN_SCALE = 10 ** LOAN_DECIMALS;
export const LEGACY_SCALE = 100;
export const LOAN_MAX_AMOUNT = 1e11;

export const parseDecimalMinor = (raw, decimals = LOAN_DECIMALS, maxAmount = LOAN_MAX_AMOUNT) => {
  if (typeof raw !== 'number' && typeof raw !== 'string') return undefined;
  const text = String(raw).trim();
  const match = /^(\d{1,12})(?:\.(\d+))?$/.exec(text);
  if (!match) return undefined;
  const fraction = match[2] || '';
  if (fraction.length > decimals) return undefined;
  const whole = Number(match[1]);
  if (whole > maxAmount) return undefined;
  const minor = whole * 10 ** decimals + Number(fraction.padEnd(decimals, '0') || 0);
  return minor >= 1 ? minor : undefined;
};

export const minorToMajor = (minor, scale = LEGACY_SCALE) => Math.round(minor) / scale;
