import { amountForTotal } from './salaryCuts.js';
import { toBase } from './incomeMath.js';
import { dayKey } from './expenseMath.js';

// One place for the balance rules, so the Dashboard, the Income page and each
// stream's detail all read the same numbers.
//
//   total balance = opening balance
//                 + income received (after deductions the stream takes off)
//                 - money I paid myself (plus money others paid that I paid back)
//   left this month = received in that month - spent by me in that month
//
// Only income and spending ON OR AFTER the opening balance date count on top of
// the opening balance. Other currencies use today's rate (an old amount is NOT
// converted at the rate of its day).

export const convert = (amount, code, rates, base) => (code === base ? amount : toBase(amount, code, rates));

export const receiptAmounts = (receipt, stream) => {
  const gross = receipt.amount;
  if (!stream || stream.currency !== receipt.currency) return { gross, net: gross };
  const net = amountForTotal({ ...stream, expectedAmount: receipt.amount });
  return { gross, net: Number.isFinite(net) ? net : gross };
};

const inScope = (day, { since, month }) => {
  if (since && day < since) return false;
  if (month && day.slice(0, 7) !== month) return false;
  return true;
};

export const sumReceipts = (receipts, streamsById, rates, base, scope = {}) => {
  let gross = 0;
  let net = 0;
  let excluded = 0;
  receipts.forEach((receipt) => {
    if (!inScope(dayKey(receipt.receivedAt), scope)) return;
    const amounts = receiptAmounts(receipt, streamsById.get(receipt.streamId));
    const grossBase = convert(amounts.gross, receipt.currency, rates, base);
    const netBase = convert(amounts.net, receipt.currency, rates, base);
    if (grossBase === null || netBase === null) {
      excluded += 1;
      return;
    }
    gross += grossBase;
    net += netBase;
  });
  return { gross, net, excluded };
};

// rows: [{ month, currency, self, other, repaid }] from /api/expenses/totals.
// What leaves my balance = what I paid + what others paid that I paid back.
export const sumSpent = (rows, rates, base, { month } = {}) => {
  let spentAll = 0;
  let other = 0;
  let repaid = 0;
  let spentSelf = 0;
  let excluded = 0;
  rows.forEach((row) => {
    if (month && row.month !== month) return;
    const self = convert(row.self, row.currency, rates, base);
    const others = convert(row.other, row.currency, rates, base);
    const paidBack = convert(row.repaid, row.currency, rates, base);
    if (self === null || others === null || paidBack === null) {
      excluded += 1;
      return;
    }
    spentAll += self + others;
    other += others;
    repaid += paidBack;
    spentSelf += self + Math.min(paidBack, others);
  });
  return { spentAll, other, repaid, spentSelf, excluded };
};

export const openingSince = (opening) => (opening && opening.amount > 0 && opening.asOf ? opening.asOf : '');

export const computeBalance = ({ opening, receipts, streams, totals, rates, base, month }) => {
  const streamsById = new Map(streams.map((stream) => [stream.id, stream]));
  const since = openingSince(opening);

  let openingValue = 0;
  let openingExcluded = 0;
  if (opening && opening.amount > 0) {
    const value = convert(opening.amount, opening.currency || base, rates, base);
    if (value === null) openingExcluded = 1;
    else openingValue = value;
  }

  const all = sumReceipts(receipts, streamsById, rates, base, { since });
  const inMonth = sumReceipts(receipts, streamsById, rates, base, { since, month });
  const spent = sumSpent(totals, rates, base);
  const spentMonth = sumSpent(totals, rates, base, { month });

  const running = openingValue + all.net - spent.spentSelf;
  const left = inMonth.net - spentMonth.spentSelf;

  return {
    running,
    opening: openingValue,
    receiptCount: receipts.length,
    income: { gross: all.gross, net: all.net, cuts: Math.max(0, all.gross - all.net) },
    month: {
      key: month,
      received: inMonth.net,
      receivedGross: inMonth.gross,
      spentAll: spentMonth.spentAll,
      other: spentMonth.other,
      repaid: spentMonth.repaid,
      spentSelf: spentMonth.spentSelf,
      left,
    },
    excluded: all.excluded + spent.excluded + openingExcluded,
    overspentMonth: left < -0.005,
    belowZero: running < -0.005,
  };
};
