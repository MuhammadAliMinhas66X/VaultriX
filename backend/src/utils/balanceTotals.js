// Pure helpers for the balance totals endpoint. Kept free of database calls so
// they can be unit tested.

// How much of an expense that SOMEONE ELSE paid I have already paid back, in
// minor units. Same rule as the client (`expenseMath.repaidAmount`): the share is
// the borrowed loan's paid / amount, capped between 0 and 1.
export const repaidMinorOf = (expense, loanSummary) => {
  if (expense.paidBy !== 'other' || !loanSummary || loanSummary.direction !== 'borrowed') return 0;
  if (!(loanSummary.amount > 0)) return 0;
  const share = Math.min(1, Math.max(0, loanSummary.paid / loanSummary.amount));
  return Math.round(expense.amountMinor * share);
};

// Turns grouped rows ({ _id: { month, currency, paidBy }, minor }) into
// [{ month, currency, selfMinor, otherMinor, repaidMinor }] sorted by month.
export const buildTotals = (groups, repaidByKey = new Map()) => {
  const rows = new Map();
  const rowFor = (month, currency) => {
    const key = `${month}|${currency}`;
    if (!rows.has(key)) rows.set(key, { month, currency, selfMinor: 0, otherMinor: 0, repaidMinor: 0 });
    return rows.get(key);
  };
  groups.forEach((group) => {
    const row = rowFor(group._id.month, group._id.currency);
    if (group._id.paidBy === 'other') row.otherMinor += group.minor;
    else row.selfMinor += group.minor;
  });
  repaidByKey.forEach((minor, key) => {
    const [month, currency] = key.split('|');
    rowFor(month, currency).repaidMinor += minor;
  });
  return [...rows.values()]
    .map((row) => ({ ...row, repaidMinor: Math.min(row.repaidMinor, row.otherMinor) }))
    .sort((a, b) => (a.month === b.month ? a.currency.localeCompare(b.currency) : a.month.localeCompare(b.month)));
};
