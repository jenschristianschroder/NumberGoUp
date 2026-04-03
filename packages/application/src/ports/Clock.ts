/**
 * Clock port – allows deterministic injection of "now" in tests.
 * All command handlers must use this instead of `new Date()`.
 */
export interface Clock {
  now(): Date;
}

export const SystemClock: Clock = {
  now: () => new Date(),
};
