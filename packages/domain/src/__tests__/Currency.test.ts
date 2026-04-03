import { describe, it, expect } from 'vitest';
import {
  parseCurrency,
  formatCurrency,
  addCurrency,
  subtractCurrency,
  applyCurrencyMultiplier,
} from '../valueObjects/Currency.js';

describe('Currency value object', () => {
  it('parses a decimal string to bigint', () => {
    expect(parseCurrency('1000')).toBe(1000n);
  });

  it('formats bigint to string', () => {
    expect(formatCurrency(1000n)).toBe('1000');
  });

  it('adds two amounts', () => {
    expect(addCurrency(100n, 200n)).toBe(300n);
  });

  it('subtracts a smaller amount', () => {
    expect(subtractCurrency(500n, 200n)).toBe(300n);
  });

  it('throws when subtracting more than available', () => {
    expect(() => subtractCurrency(100n, 200n)).toThrow('Insufficient funds');
  });

  it('applies a 1.5× multiplier (scaled 1500)', () => {
    expect(applyCurrencyMultiplier(1000n, 1500n)).toBe(1500n);
  });

  it('applies a 2× multiplier (scaled 2000)', () => {
    expect(applyCurrencyMultiplier(500n, 2000n)).toBe(1000n);
  });

  it('applies a 1× multiplier (scaled 1000) without change', () => {
    expect(applyCurrencyMultiplier(999n, 1000n)).toBe(999n);
  });
});
