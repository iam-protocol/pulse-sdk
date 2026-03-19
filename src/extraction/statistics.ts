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

export function fuseFeatures(
  audio: number[],
  motion: number[],
  touch: number[]
): number[] {
  return [...audio, ...motion, ...touch];
}
