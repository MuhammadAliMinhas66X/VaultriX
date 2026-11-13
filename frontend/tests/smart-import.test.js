import { describe, it, expect } from 'vitest';
import { parseCsv } from '../src/utils/csvImport.js';
import { analyzeTable, detectColumns, classifyRow, countByKind, orderForImport } from '../src/utils/smartImport.js';

const analyze = (csv) => analyzeTable(parseCsv(csv), 'PKR');
const kinds = (csv) => analyze(csv).rows.map((row) => row.kind);

describe('smart import: columns', () => {
  it('finds columns by header names', () => {
    const map = detectColumns(parseCsv('Txn Date,Narration,Debit,Credit,Balance\n01/11/2026,Lunch,250,,9000\n'));
    expect(map).toMatchObject({ date: 0, note: 1, debit: 2, credit: 3 });
    expect(map.amount).toBeUndefined();
  });

  it('finds columns by what the cells look like when headers say nothing', () => {
    const map = detectColumns(parseCsv('A,B,C,D\n2026-11-01,250,Lunch with the team,PKR\n2026-11-02,1200,Fuel for the car,PKR\n2026-11-03,90,Tea at the office,PKR\n'));
    expect(map).toMatchObject({ date: 0, amount: 1, note: 2, currency: 3 });
  });
});

describe('smart import: what each row is', () => {
  it('uses money in / money out columns', () => {
    const out = analyze('Date,Details,Debit,Credit\n01/11/2026,Grocery store,1500,\n02/11/2026,Salary November,,90000\n');
    expect(out.rows.map((row) => [row.kind, row.amount])).toEqual([['expense', '1500'], ['income', '90000']]);
  });

  it('treats minus as money out and plus as money in when the file mixes them', () => {
    expect(kinds('Date,Description,Amount\n2026-11-01,Lunch,-250\n2026-11-02,Client payment received,5000\n')).toEqual(['expense', 'income']);
  });

  it('recognises bills by company name and by words', () => {
    const rows = analyze('Date,Description,Amount\n2026-11-03,IESCO electricity,8400\n2026-11-04,PTCL,3160\n2026-11-05,Water bill,900\n').rows;
    expect(rows.map((row) => row.kind)).toEqual(['bill', 'bill', 'bill']);
    expect(rows[0]).toMatchObject({ biller: 'IESCO', billerId: 'iesco' });
  });

  it('recognises loans, who with, and which way', () => {
    const rows = analyze('Date,Description,Amount\n2026-11-01,Borrowed from Waqas,20000\n2026-11-02,Lent to Shahid,5000\n').rows;
    expect(rows[0]).toMatchObject({ kind: 'loan', direction: 'borrowed', person: 'Waqas' });
    expect(rows[1]).toMatchObject({ kind: 'loan', direction: 'lent', person: 'Shahid' });
  });

  it('recognises loan repayments and puts them after the loans', () => {
    const rows = analyze('Date,Description,Amount\n2026-11-09,Repaid to Waqas,5000\n2026-11-01,Borrowed from Waqas,20000\n').rows;
    expect(rows[0]).toMatchObject({ kind: 'loanPayment', direction: 'borrowed', person: 'Waqas' });
    expect(orderForImport(rows).map((row) => row.kind)).toEqual(['loan', 'loanPayment']);
  });

  it('an explicit Type column wins', () => {
    expect(kinds('Date,Type,Description,Amount\n2026-11-01,Income,Rent from tenant,30000\n2026-11-02,Expense,Cab,400\n')).toEqual(['income', 'expense']);
  });

  it('a past bill is paid, a future one or "pending" is unpaid', () => {
    const future = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
    const rows = analyze(`Date,Description,Amount,Status\n2026-01-05,Jazz,1000,\n${future},Nayatel,2000,\n2026-02-01,Sui gas bill,500,Pending\n`).rows;
    expect(rows.map((row) => row.paid)).toEqual([true, false, false]);
  });

  it('plain spending stays an expense and keeps its date and category', () => {
    const rows = analyze('Date,Description,Amount,Category\n2026-11-01,Lunch,250,Food\n2026-11-02,Fuel,3000,Transport\n').rows;
    expect(rows.map((row) => [row.kind, row.date, row.category])).toEqual([['expense', '2026-11-01', 'Food'], ['expense', '2026-11-02', 'Transport']]);
    expect(countByKind(rows).expense).toBe(2);
  });

  it('classifyRow alone', () => {
    expect(classifyRow({ text: 'Salary', flow: '' }).kind).toBe('income');
    expect(classifyRow({ text: 'Coffee', flow: 'out' }).kind).toBe('expense');
  });
});

describe('smart import: bad files', () => {
  it('says when there is no date or no amount', () => {
    expect(analyze('Name,City\nAli,Lahore\n').error).toBe('columns');
    expect(analyze('Date,Amount').error).toBe('empty');
  });
});
