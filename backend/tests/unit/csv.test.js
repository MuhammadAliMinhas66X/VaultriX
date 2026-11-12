import { describe, it, expect } from 'vitest';
import { csvCell, toCsv } from '../../src/utils/csv.js';

describe('csv', () => {
  it('quotes commas, quotes and new lines', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('two\nlines')).toBe('"two\nlines"');
  });

  it('defuses spreadsheet formulas in text but keeps numbers', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell(-5)).toBe('-5');
    expect(csvCell(null)).toBe('');
  });

  it('writes a BOM, a header row and one line per row', () => {
    const out = toCsv([{ label: 'Name', value: (r) => r.n }, { label: 'Amount', value: (r) => r.a }], [{ n: 'Ali', a: 10.5 }]);
    expect(out).toBe('﻿Name,Amount\r\nAli,10.5\r\n');
  });
});
