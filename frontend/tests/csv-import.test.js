import { describe, it, expect } from 'vitest';
import { parseCsv, normalizeDate, normalizeAmount, toExpenseRows } from '../src/utils/csvImport.js';

describe('csv import', () => {
  it('parses quotes, commas inside quotes, BOM and CRLF', () => {
    const table = parseCsv('﻿Date,Amount,Note\r\n2026-11-01,"1,200.50","Lunch, with ""Ali"""\r\n');
    expect(table).toEqual([['Date', 'Amount', 'Note'], ['2026-11-01', '1,200.50', 'Lunch, with "Ali"']]);
  });

  it('reads semicolon files', () => {
    expect(parseCsv('a;b\n1;2')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('normalizes dates (day first) and rejects fake ones', () => {
    expect(normalizeDate('2026-11-05')).toBe('2026-11-05');
    expect(normalizeDate('05/11/2026')).toBe('2026-11-05');
    expect(normalizeDate('31/02/2026')).toBe('');
    expect(normalizeDate('hello')).toBe('');
  });

  it('normalizes amounts and rejects negatives and empties', () => {
    expect(normalizeAmount('Rs 1,200.50')).toBe('1200.50');
    expect(normalizeAmount('1.200,50')).toBe('1200.50');
    expect(normalizeAmount('500')).toBe('500');
    expect(normalizeAmount('-20')).toBe('');
    expect(normalizeAmount('')).toBe('');
  });

  it('maps columns by name and lists bad lines', () => {
    const table = parseCsv('Description,Date,Total,Category\nLunch,01/11/2026,250,Food\nBad,xx,10,\nZero,02/11/2026,0,');
    const out = toExpenseRows(table, 'PKR');
    expect(out.rows).toEqual([{ row: 2, date: '2026-11-01', amount: '250', currency: 'PKR', category: 'Food', note: 'Lunch' }]);
    expect(out.bad).toEqual([3, 4]);
  });

  it('says when the date or amount column is missing', () => {
    expect(toExpenseRows(parseCsv('a,b\n1,2'), 'PKR').error).toBe('columns');
    expect(toExpenseRows(parseCsv('Date,Amount'), 'PKR').error).toBe('empty');
  });
});
