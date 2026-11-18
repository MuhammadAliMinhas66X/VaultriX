import { describe, it, expect } from 'vitest';
import { statusText, failureText, formatLatency, formatAgo, formatUptime, formatPercent } from '../src/utils/healthView.js';

describe('health view helpers', () => {
  it('names every status in words, so colour is never the only signal', () => {
    expect(statusText('ok')).toBe('Operational');
    expect(statusText('degraded')).toBe('Degraded');
    expect(statusText('down')).toBe('Down');
    expect(statusText('not_configured')).toBe('Not configured');
    expect(statusText('something-new')).toBe('Not checked yet');
  });

  it('explains failure categories in plain words and never echoes unknown input', () => {
    expect(failureText('timeout')).toContain('too long');
    expect(failureText('weird<script>')).toBe('The check failed.');
    expect(failureText(null)).toBe('');
  });

  it('formats latency', () => {
    expect(formatLatency(null)).toBe('n/a');
    expect(formatLatency(42.4)).toBe('42 ms');
    expect(formatLatency(2500)).toBe('2.5 s');
  });

  it('formats relative times', () => {
    const now = new Date('2026-11-18T10:00:00Z').getTime();
    expect(formatAgo(null, now)).toBe('never');
    expect(formatAgo('2026-11-18T09:59:58Z', now)).toBe('just now');
    expect(formatAgo('2026-11-18T09:59:30Z', now)).toBe('30s ago');
    expect(formatAgo('2026-11-18T09:50:00Z', now)).toBe('10 min ago');
    expect(formatAgo('2026-11-18T07:00:00Z', now)).toBe('3 h ago');
  });

  it('formats uptime and percentages', () => {
    expect(formatUptime(59)).toBe('0m');
    expect(formatUptime(3700)).toBe('1h 1m');
    expect(formatUptime(90000)).toBe('1d 1h');
    expect(formatUptime(NaN)).toBe('n/a');
    expect(formatPercent(null)).toBe('n/a');
    expect(formatPercent(66.7)).toBe('66.7%');
  });
});
