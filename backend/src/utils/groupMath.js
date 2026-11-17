// Pure maths for shared groups (rent, food, trips). Money is whole minor units.

// Splits `amountMinor` between people so the parts add up exactly:
// 1000 between 3 gives 334, 333, 333 (the extra pennies go to the first people).
export const splitEqual = (amountMinor, userIds) => {
  const count = userIds.length;
  if (count === 0) return [];
  const base = Math.floor(amountMinor / count);
  const extra = amountMinor - base * count;
  return userIds.map((userId, index) => ({ userId: String(userId), amountMinor: base + (index < extra ? 1 : 0) }));
};

// Splits `amountMinor` by percentages given in basis points (50.5% = 5050). The points
// must add up to 10000 (100%). Pennies left over go to the biggest remainders, so the
// parts always add up exactly. Returns null when the percentages do not make 100%.
export const splitByPercent = (amountMinor, entries) => {
  if (!entries.length || entries.reduce((sum, entry) => sum + entry.bp, 0) !== 10000) return null;
  const rows = entries.map((entry, index) => {
    const exact = (amountMinor * entry.bp) / 10000;
    return { index, userId: String(entry.userId), bp: entry.bp, amountMinor: Math.floor(exact), rest: exact - Math.floor(exact) };
  });
  let left = amountMinor - rows.reduce((sum, row) => sum + row.amountMinor, 0);
  [...rows].sort((a, b) => b.rest - a.rest || a.index - b.index).forEach((row) => {
    if (left > 0) {
      row.amountMinor += 1;
      left -= 1;
    }
  });
  return rows.map(({ userId, bp, amountMinor: minor }) => ({ userId, amountMinor: minor, percentBp: bp }));
};

// Net per person per currency. Positive = the group owes them, negative = they owe the group.
// Settlements move money from one person to another: the payer's balance goes up, the receiver's down.
export const computeBalances = (expenses, settlements) => {
  const byCurrency = {};
  const add = (currency, userId, minor) => {
    byCurrency[currency] = byCurrency[currency] || {};
    byCurrency[currency][userId] = (byCurrency[currency][userId] || 0) + minor;
  };
  expenses.forEach((expense) => {
    add(expense.currency, String(expense.paidBy), expense.amountMinor);
    (expense.shares || []).forEach((share) => add(expense.currency, String(share.userId), -share.amountMinor));
  });
  settlements.forEach((settlement) => {
    add(settlement.currency, String(settlement.fromUserId), settlement.amountMinor);
    add(settlement.currency, String(settlement.toUserId), -settlement.amountMinor);
  });
  return byCurrency;
};

// The fewest simple payments that clear everyone: biggest debtor pays biggest creditor.
export const suggestTransfers = (balances) => {
  const debtors = [];
  const creditors = [];
  Object.entries(balances).forEach(([userId, minor]) => {
    if (minor < 0) debtors.push({ userId, minor: -minor });
    else if (minor > 0) creditors.push({ userId, minor });
  });
  debtors.sort((a, b) => b.minor - a.minor);
  creditors.sort((a, b) => b.minor - a.minor);
  const transfers = [];
  let d = 0;
  let c = 0;
  while (d < debtors.length && c < creditors.length) {
    const pay = Math.min(debtors[d].minor, creditors[c].minor);
    if (pay > 0) transfers.push({ fromUserId: debtors[d].userId, toUserId: creditors[c].userId, amountMinor: pay });
    debtors[d].minor -= pay;
    creditors[c].minor -= pay;
    if (debtors[d].minor === 0) d += 1;
    if (creditors[c].minor === 0) c += 1;
  }
  return transfers;
};
