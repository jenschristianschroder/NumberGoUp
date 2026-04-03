/**
 * Currency is stored and computed as BigInt to guarantee integer-safe
 * arithmetic with no floating-point drift.
 *
 * All persistence layers serialise Currency as a decimal string.
 */
export type Currency = bigint;

export function parseCurrency(value: string): Currency {
  return BigInt(value);
}

export function formatCurrency(value: Currency): string {
  return value.toString();
}

export function addCurrency(a: Currency, b: Currency): Currency {
  return a + b;
}

export function subtractCurrency(a: Currency, b: Currency): Currency {
  if (b > a) throw new Error('Insufficient funds');
  return a - b;
}

/**
 * Scale a currency amount by a multiplier stored as an integer × 1000.
 * Example: amount=1000n, multiplier=1500n → 1500n  (1.5× effective)
 */
export function applyCurrencyMultiplier(amount: Currency, multiplierScaled: bigint): Currency {
  return (amount * multiplierScaled) / 1000n;
}
