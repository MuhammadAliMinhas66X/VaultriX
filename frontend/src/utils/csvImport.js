// Reads a CSV file of expenses. Works with commas or semicolons, quoted cells,
// a BOM and Windows line ends. No library needed.

export const parseCsv = (input) => {
  const text = String(input || '').replace(/^﻿/, '');
  const first = text.split(/\r?\n/, 1)[0] || '';
  const delimiter = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell);
      cell = '';
      rows.push(row);
      row = [];
    } else cell += char;
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((items) => items.some((item) => item.trim() !== ''));
};

const ALIASES = {
  date: ['date', 'day', 'spent at', 'spent on', 'transaction date', 'when'],
  amount: ['amount', 'total', 'price', 'cost', 'value', 'spent'],
  currency: ['currency', 'curr', 'ccy'],
  category: ['category', 'type', 'group'],
  note: ['note', 'notes', 'description', 'details', 'memo', 'title', 'what'],
};

export const mapColumns = (header) => {
  const found = {};
  header.forEach((name, index) => {
    const key = String(name).trim().toLowerCase();
    Object.entries(ALIASES).forEach(([field, names]) => {
      if (found[field] === undefined && names.includes(key)) found[field] = index;
    });
  });
  return found;
};

const pad = (value) => String(value).padStart(2, '0');

// YYYY-MM-DD, or day first (DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY). Returns '' if it is not a real date.
export const normalizeDate = (raw) => {
  const text = String(raw || '').trim();
  let year;
  let month;
  let day;
  let match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(text);
  if (match) [, year, month, day] = match;
  else if ((match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/.exec(text))) [, day, month, year] = match;
  else return '';
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return '';
  return `${y}-${pad(m)}-${pad(d)}`;
};

// "Rs 1,200.50", "1 200,5", "500" -> "1200.50" / "1200.5" / "500". Negative or empty -> ''.
export const normalizeAmount = (raw) => {
  let text = String(raw || '').trim();
  if (!text || /^\(.*\)$/.test(text) || text.startsWith('-')) return '';
  text = text.replace(/[^\d.,]/g, '');
  if (!text) return '';
  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  if (lastComma > lastDot) text = /,\d{1,2}$/.test(text) ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '');
  else text = text.replace(/,/g, '');
  return Number(text) > 0 ? text : '';
};

// Turns the parsed file into rows for the API. `row` is the line number in the file (header = line 1).
export const toExpenseRows = (table, defaultCurrency) => {
  if (table.length < 2) return { columns: {}, rows: [], bad: [], error: 'empty' };
  const columns = mapColumns(table[0]);
  if (columns.date === undefined || columns.amount === undefined) return { columns, rows: [], bad: [], error: 'columns' };

  const rows = [];
  const bad = [];
  table.slice(1).forEach((cells, index) => {
    const line = index + 2;
    const date = normalizeDate(cells[columns.date]);
    const amount = normalizeAmount(cells[columns.amount]);
    const currency = columns.currency !== undefined ? String(cells[columns.currency] || '').trim().toUpperCase() || defaultCurrency : defaultCurrency;
    if (!date || !amount) {
      bad.push(line);
      return;
    }
    rows.push({
      row: line,
      date,
      amount,
      currency,
      category: columns.category !== undefined ? String(cells[columns.category] || '').trim() : '',
      note: columns.note !== undefined ? String(cells[columns.note] || '').trim().slice(0, 200) : '',
    });
  });
  return { columns, rows, bad, error: '' };
};
