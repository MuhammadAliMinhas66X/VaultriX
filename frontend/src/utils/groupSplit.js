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

// Percent split preview, same rule as the server (pennies go to the biggest remainders).
export const percentLeft = (parts) => Math.round((100 - Object.values(parts).reduce((sum, value) => sum + Number(value || 0), 0)) * 100) / 100;
export const splitPercentMinor = (amountMinor, parts) => {
  const rows = Object.entries(parts).map(([id, value]) => ({ id, exact: (amountMinor * Math.round(Number(value || 0) * 100)) / 10000 })).filter((row) => row.exact > 0);
  const out = {};
  rows.forEach((row) => { out[row.id] = Math.floor(row.exact); });
  let rest = amountMinor - Object.values(out).reduce((sum, value) => sum + value, 0);
  [...rows].sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact))).forEach((row) => {
    if (rest > 0) { out[row.id] += 1; rest -= 1; }
  });
  return out;
};
