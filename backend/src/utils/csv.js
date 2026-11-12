// CSV helpers. Cells that start with = + - @ (or a tab / carriage return) get a
// leading apostrophe so a spreadsheet never runs them as a formula.
const FORMULA_START = /^[=+\-@\t\r]/;

export const csvCell = (value) => {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsv = (columns, rows) => {
  const head = columns.map((column) => csvCell(column.label)).join(',');
  const lines = rows.map((row) => columns.map((column) => csvCell(column.value(row))).join(','));
  // BOM so Excel opens UTF-8 (Urdu, Arabic, Hindi names) correctly.
  return `﻿${[head, ...lines].join('\r\n')}\r\n`;
};
