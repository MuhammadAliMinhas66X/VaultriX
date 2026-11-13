import { BILLERS } from './billers.js';
import { normalizeAmount, normalizeDate } from './csvImport.js';

// Reads a table (from parseCsv) and works out, on its own:
//   - which column is the date, amount, description, category, person, status ...
//     (by the header name first, then by what the cells look like),
//   - what each row IS: an expense, income, a bill, a loan, or a loan payment,
//   - which date it belongs on (a paid bill gets a payment on that day, a loan
//     starts on that day, income arrives on that day ...).
// Everything is a suggestion: the screen lets the person change any row before
// anything is saved.

export const KINDS = ['expense', 'income', 'bill', 'loan', 'loanPayment'];

const HEADERS = {
  date: ['date', 'day', 'spent at', 'spent on', 'transaction date', 'txn date', 'value date', 'posting date', 'booking date', 'when', 'due date'],
  amount: ['amount', 'total', 'price', 'cost', 'value', 'spent', 'sum', 'amt'],
  debit: ['debit', 'withdrawal', 'withdrawals', 'paid out', 'money out', 'dr', 'out'],
  credit: ['credit', 'deposit', 'deposits', 'paid in', 'money in', 'cr', 'in'],
  currency: ['currency', 'curr', 'ccy'],
  category: ['category', 'group', 'tag'],
  note: ['note', 'notes', 'description', 'details', 'memo', 'title', 'what', 'narration', 'particulars', 'remarks', 'reference'],
  type: ['type', 'kind', 'transaction type', 'txn type', 'entry'],
  status: ['status', 'state', 'paid'],
  person: ['person', 'party', 'counterparty', 'payee', 'name', 'contact', 'lender', 'borrower'],
  ignore: ['balance', 'running balance', 'closing balance', 'ref', 'ref no', 'id', 'cheque', 'cheque no', 'serial', 'no', '#'],
};

const norm = (value) => String(value || '').trim().toLowerCase();
const cells = (table, index) => table.slice(1).map((row) => String(row[index] ?? '').trim());
const ratio = (list, test) => {
  const filled = list.filter((item) => item !== '');
  return filled.length === 0 ? 0 : filled.filter(test).length / filled.length;
};

const TYPE_WORDS = {
  expense: ['expense', 'debit', 'withdrawal', 'spent', 'purchase', 'out', 'dr'],
  income: ['income', 'credit', 'deposit', 'salary', 'received', 'in', 'cr', 'earning'],
  bill: ['bill', 'utility'],
  loan: ['loan', 'borrowed', 'borrow', 'lent', 'lend', 'udhaar', 'qarz', 'debt'],
};
const STATUS_UNPAID = ['unpaid', 'pending', 'due', 'overdue', 'open', 'no', 'false', 'not paid'];
const STATUS_PAID = ['paid', 'settled', 'done', 'yes', 'true', 'closed', 'cleared'];

export const detectColumns = (table) => {
  const header = table[0].map(norm);
  const map = {};
  const used = new Set();
  const take = (field, index) => {
    if (index >= 0 && !used.has(index) && map[field] === undefined) {
      map[field] = index;
      used.add(index);
    }
  };

  // 1) by header name (exact words first)
  ['ignore', 'date', 'debit', 'credit', 'amount', 'currency', 'type', 'status', 'person', 'category', 'note'].forEach((field) => {
    header.forEach((name, index) => {
      if (HEADERS[field].includes(name) && !used.has(index)) {
        if (field === 'ignore') used.add(index);
        else take(field, index);
      }
    });
  });

  // 2) by what the cells look like
  const free = (index) => !used.has(index);
  const indexes = header.map((_, index) => index);
  if (map.date === undefined) {
    const best = indexes.filter(free).map((i) => [i, ratio(cells(table, i), (c) => normalizeDate(c) !== '')]).sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] >= 0.6) take('date', best[0]);
  }
  if (map.amount === undefined && map.debit === undefined && map.credit === undefined) {
    const best = indexes.filter(free).map((i) => [i, ratio(cells(table, i), (c) => /^[-(]?[^\d]{0,4}[\d][\d.,\s]*\)?\s*[A-Za-z]{0,3}$/.test(c) && normalizeAmount(c.replace(/^-/, '')) !== '')]).sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] >= 0.7) take('amount', best[0]);
  }
  if (map.currency === undefined) {
    const best = indexes.filter(free).map((i) => [i, ratio(cells(table, i), (c) => /^[A-Za-z]{3}$/.test(c))]).sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] >= 0.8) take('currency', best[0]);
  }
  if (map.note === undefined) {
    const best = indexes.filter(free).map((i) => [i, cells(table, i).reduce((sum, c) => sum + c.length, 0) / Math.max(1, table.length - 1)]).sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] >= 6) take('note', best[0]);
  }
  if (map.category === undefined) {
    const best = indexes
      .filter(free)
      .map((i) => {
        const list = cells(table, i).filter(Boolean);
        return [i, list.length, new Set(list.map(norm)).size, list.reduce((s, c) => s + c.length, 0) / Math.max(1, list.length)];
      })
      .filter(([, count, distinct, avg]) => count >= 2 && distinct <= Math.max(2, Math.ceil(count / 2)) && avg <= 24)
      .sort((a, b) => a[2] - b[2])[0];
    if (best) take('category', best[0]);
  }
  return map;
};

const lower = (text) => ` ${String(text || '').toLowerCase()} `;
const BILL_WORDS = /\b(bill|electricity|electric|gas|water|internet|broadband|wifi|utility|utilities|postpaid|insurance premium|premium|subscription|sui gas|wapda|k-?electric)\b/;
const BILLERS_RE = BILLERS.map((biller) => ({ biller, re: new RegExp(`\\b${biller.name.replace(/[^a-z0-9]+/gi, '[ .-]?').toLowerCase()}\\b`) }));
const LOAN_WORDS = /\b(loan|borrow(?:ed|ing)?|lent|lend(?:ing)?|udhaar|udhar|qarz|qarza|advance|owes?|owed)\b/;
const REPAY_WORDS = /\b(repaid|repay|repayment|returned|return of|paid back|pay back|payback|wapis|settled with|installment|instalment)\b/;
const INCOME_WORDS = /\b(salary|payroll|wages?|deposit|credited|income|received|freelance|invoice|dividend|interest earned|bonus|commission|refund|cashback)\b/;
const BORROW_WORDS = /\b(borrow(?:ed)?|udhaar liya|owe(?:d)? to|loan from|received loan|from)\b/;
const LEND_WORDS = /\b(lent|lend(?:ing)?|udhaar diya|gave|given|loan to|owes me|owes you|to)\b/;

const matchBiller = (text) => {
  const t = String(text || '').toLowerCase();
  const found = BILLERS_RE.find(({ re }) => re.test(t));
  return found ? found.biller : null;
};

const explicitKind = (value) => {
  const v = norm(value);
  if (!v) return '';
  const hit = Object.entries(TYPE_WORDS).find(([, words]) => words.includes(v));
  return hit ? hit[0] : '';
};

const personFrom = (text) => {
  const m = /\b(?:from|to|by|with|for)\s+([A-Za-z][A-Za-z.'-]*(?:\s+[A-Za-z][A-Za-z.'-]*){0,2})/.exec(String(text || ''));
  if (m) return m[1].trim();
  const words = String(text || '').replace(/\b(loan|borrowed|lent|repaid|repayment|returned|udhaar|qarz)\b/gi, '').trim();
  return words.split(/\s+/).slice(0, 3).join(' ').slice(0, 40);
};

const todayKey = () => new Date().toISOString().slice(0, 10);

// Works out what one row is. `flow` is 'out', 'in' or '' (not known).
export const classifyRow = ({ text, category, typeValue, flow, personValue, statusValue }) => {
  const haystack = lower(`${text} ${category}`);
  const out = { kind: 'expense', direction: '', person: '', biller: null, confidence: 'medium', reason: 'default' };

  const forced = explicitKind(typeValue);
  const loanish = LOAN_WORDS.test(haystack) || forced === 'loan';
  const repay = REPAY_WORDS.test(haystack);
  const biller = matchBiller(`${text} ${category}`);

  if (loanish || repay) {
    out.person = personValue || personFrom(text);
    if (repay) {
      out.kind = 'loanPayment';
      out.direction = flow === 'in' || /\b(returned by|received back|repaid me)\b/.test(haystack) ? 'lent' : 'borrowed';
      out.reason = 'repay-words';
    } else {
      out.kind = 'loan';
      const borrowed = BORROW_WORDS.test(haystack) && !/\b(lent|lend|gave|given|owes me|owes you)\b/.test(haystack);
      const lent = /\b(lent|lend|lending|udhaar diya|gave|given|owes me|owes you)\b/.test(haystack);
      out.direction = lent ? 'lent' : borrowed ? 'borrowed' : flow === 'in' ? 'borrowed' : 'lent';
      out.reason = 'loan-words';
    }
    out.confidence = 'high';
    return out;
  }

  if (forced === 'bill' || biller || BILL_WORDS.test(haystack)) {
    out.kind = 'bill';
    out.biller = biller;
    out.confidence = forced === 'bill' || biller ? 'high' : 'medium';
    out.reason = biller ? 'biller-name' : 'bill-words';
    out.status = STATUS_UNPAID.includes(norm(statusValue)) ? 'unpaid' : STATUS_PAID.includes(norm(statusValue)) ? 'paid' : '';
    return out;
  }

  if (forced === 'income' || flow === 'in' || INCOME_WORDS.test(haystack)) {
    out.kind = 'income';
    out.confidence = forced === 'income' || flow === 'in' ? 'high' : 'medium';
    out.reason = flow === 'in' ? 'money-in' : 'income-words';
    return out;
  }
  if (forced === 'expense' || flow === 'out') {
    out.confidence = 'high';
    out.reason = forced ? 'type-column' : 'money-out';
  }
  return out;
};

const signedAmount = (raw) => {
  const text = String(raw || '').trim();
  if (!text) return { value: '', sign: 0 };
  const negative = text.startsWith('-') || /^\(.*\)$/.test(text);
  const clean = normalizeAmount(text.replace(/^-/, '').replace(/^\((.*)\)$/, '$1'));
  return { value: clean, sign: negative ? -1 : 1 };
};

export const analyzeTable = (table, defaultCurrency) => {
  if (table.length < 2) return { error: 'empty', rows: [], bad: [], columns: {} };
  const columns = detectColumns(table);
  const hasAmount = columns.amount !== undefined || columns.debit !== undefined || columns.credit !== undefined;
  if (columns.date === undefined || !hasAmount) return { error: 'columns', rows: [], bad: [], columns };

  // A single amount column with minus signs in it means: minus = money out, plus = money in.
  const signs = columns.amount === undefined ? [] : table.slice(1).map((row) => signedAmount(row[columns.amount]).sign);
  const mixedSigns = signs.includes(-1) && signs.includes(1);

  const rows = [];
  const bad = [];
  table.slice(1).forEach((cellsOfRow, index) => {
    const line = index + 2;
    const get = (field) => (columns[field] === undefined ? '' : String(cellsOfRow[columns[field]] ?? '').trim());
    const date = normalizeDate(get('date'));

    let amount = '';
    let flow = '';
    if (columns.debit !== undefined || columns.credit !== undefined) {
      const out = signedAmount(get('debit')).value;
      const inn = signedAmount(get('credit')).value;
      if (out && Number(out) > 0) {
        amount = out;
        flow = 'out';
      } else if (inn && Number(inn) > 0) {
        amount = inn;
        flow = 'in';
      }
    }
    if (!amount && columns.amount !== undefined) {
      const parsed = signedAmount(get('amount'));
      amount = parsed.value;
      if (mixedSigns) flow = parsed.sign < 0 ? 'out' : 'in';
    }
    if (!date || !amount) {
      bad.push(line);
      return;
    }

    const text = get('note');
    const category = get('category');
    const verdict = classifyRow({ text, category, typeValue: get('type'), flow, personValue: get('person'), statusValue: get('status') });
    const currency = (get('currency') || defaultCurrency).toUpperCase();
    const paid = verdict.kind === 'bill' ? (verdict.status ? verdict.status === 'paid' : date <= todayKey()) : undefined;

    rows.push({
      row: line,
      kind: verdict.kind,
      confidence: verdict.confidence,
      date,
      amount,
      currency,
      category,
      note: text.slice(0, 200),
      person: verdict.person,
      direction: verdict.direction,
      biller: verdict.biller ? verdict.biller.name : '',
      billerId: verdict.biller ? verdict.biller.id : '',
      paid,
    });
  });

  return { error: '', rows, bad, columns };
};

export const countByKind = (rows) => {
  const counts = {};
  KINDS.forEach((kind) => {
    counts[kind] = rows.filter((row) => row.kind === kind).length;
  });
  return counts;
};

// Loans first, then everything else; oldest first, so a repayment never arrives before its loan.
export const orderForImport = (rows) => {
  const rank = { loan: 0, bill: 1, expense: 1, income: 1, loanPayment: 2 };
  return [...rows].sort((a, b) => rank[a.kind] - rank[b.kind] || a.date.localeCompare(b.date) || a.row - b.row);
};

// What each row becomes when sent to the server.
export const toApiRow = (row) => {
  const base = { row: row.row, kind: row.kind, date: row.date, amount: row.amount, currency: row.currency, note: row.note };
  if (row.kind === 'expense') return { ...base, category: row.category };
  if (row.kind === 'bill') return { ...base, billerName: row.biller || row.note.slice(0, 60) || 'Bill', billerId: row.billerId, paid: row.paid !== false };
  if (row.kind === 'loan' || row.kind === 'loanPayment') return { ...base, person: row.person || 'Unknown', direction: row.direction || 'borrowed' };
  return base;
};
