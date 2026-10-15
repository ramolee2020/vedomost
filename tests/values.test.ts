import { describe, it, expect } from 'vitest';
import { parseValue, formatValue, progressLine } from '../src/values';

describe('values', () => {
  it('parses comma decimals, zero and empty', () => {
    expect(parseValue('1,20')).toBe(1.2);
    expect(parseValue('0')).toBe(0);
    expect(parseValue('')).toBeNull();
    expect(parseValue('  ')).toBeNull();
    expect(parseValue('abc')).toBeNull();
  });
  it('formats with comma and empty for null', () => {
    expect(formatValue(1.2)).toBe('1,2');
    expect(formatValue(15)).toBe('15');
    expect(formatValue(null)).toBe('');
  });
  it('builds progress line skipping gaps', () => {
    expect(progressLine([8, null, 12, 15])).toEqual({ text: '8 → 12 → 15', trend: 'up' });
    expect(progressLine([15, 12])).toEqual({ text: '15 → 12', trend: 'down' });
    expect(progressLine([10])).toEqual({ text: '10', trend: null });
    expect(progressLine([null])).toEqual({ text: '—', trend: null });
    expect(progressLine([5, 5])).toEqual({ text: '5 → 5', trend: 'same' });
  });
});
