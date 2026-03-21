import type { StatsSummary } from "./types";

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

export function variance(values: number[], mu?: number): number {
  if (values.length < 2) return 0;
  const m = mu ?? mean(values);
  let sum = 0;
  for (const v of values) sum += (v - m) ** 2;
  return sum / (values.length - 1);
}

export function skewness(values: number[]): number {
  if (values.length < 3) return 0;
  const n = values.length;
  const m = mean(values);
  const s = Math.sqrt(variance(values, m));
  if (s === 0) return 0;
  let sum = 0;
  for (const v of values) sum += ((v - m) / s) ** 3;
  return (n / ((n - 1) * (n - 2))) * sum;
}

export function kurtosis(values: number[]): number {
  if (values.length < 4) return 0;
  const n = values.length;
  const m = mean(values);
  const s2 = variance(values, m);
  if (s2 === 0) return 0;
  let sum = 0;
  for (const v of values) sum += ((v - m) ** 4) / s2 ** 2;
  const k =
    ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum -
    (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
  return k;
}

export function condense(values: number[]): StatsSummary {
  const m = mean(values);
  return {
    mean: m,
    variance: variance(values, m),
    skewness: skewness(values),
    kurtosis: kurtosis(values),
  };
}

/**
 * Shannon entropy over histogram bins. Measures information density.
 * Real human data has moderate entropy (varied but structured).
 * Synthetic data is either too uniform (high entropy) or too structured (low entropy).
 */
export function entropy(values: number[], bins: number = 16): number {
  if (values.length < 2) return 0;
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return 0;

  const counts = new Array(bins).fill(0);
  const range = max - min;
  for (const v of values) {
    const idx = Math.min(Math.floor(((v - min) / range) * bins), bins - 1);
    counts[idx]++;
  }

  let h = 0;
  for (const c of counts) {
    if (c > 0) {
      const p = c / values.length;
      h -= p * Math.log2(p);
    }
  }
  return h;
}

/**
 * Autocorrelation at a given lag. Detects periodic synthetic patterns.
 * Real human data has low autocorrelation at most lags (chaotic/noisy).
 * Synthetic data often has high autocorrelation (periodic/smooth).
 */
export function autocorrelation(values: number[], lag: number = 1): number {
  if (values.length <= lag) return 0;
  const m = mean(values);
  const v = variance(values, m);
  if (v === 0) return 0;

  let sum = 0;
  for (let i = 0; i < values.length - lag; i++) {
    sum += (values[i]! - m) * (values[i + lag]! - m);
  }
  return sum / ((values.length - lag) * v);
}

export function fuseFeatures(
  audio: number[],
  motion: number[],
  touch: number[]
): number[] {
  return [...audio, ...motion, ...touch];
}
