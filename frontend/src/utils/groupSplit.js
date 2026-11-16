// Same rule the server uses, so the preview on screen matches what is saved.
export const toMinor = (value) => Math.round(Number(value || 0) * 100);
export const fromMinor = (minor) => minor / 100;

// 10.00 between 3 people -> 3.34, 3.33, 3.33 (the extra pennies go to the first people).
export const splitEqualMinor = (amountMinor, ids) => {
  if (ids.length === 0) return {};
  const base = Math.floor(amountMinor / ids.length);
  const extra = amountMinor - base * ids.length;
  const out = {};
  ids.forEach((id, index) => {
    out[id] = base + (index < extra ? 1 : 0);
  });
  return out;
};

// How much of the total is still not given to anyone in an exact split.
export const leftToAssign = (amount, parts) => toMinor(amount) - Object.values(parts).reduce((sum, value) => sum + toMinor(value), 0);
