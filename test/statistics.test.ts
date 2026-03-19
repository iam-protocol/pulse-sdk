import { describe, it, expect } from "vitest";
import { mean, variance, skewness, kurtosis, condense } from "../src/extraction/statistics";

describe("statistics", () => {
  it("computes mean correctly", () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3);
    expect(mean([10])).toBe(10);
    expect(mean([])).toBe(0);
  });

  it("computes variance correctly", () => {
    // Sample variance of [2, 4, 4, 4, 5, 5, 7, 9]
    const v = variance([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(v).toBeCloseTo(4.571, 2);
  });

  it("returns zero variance for constant array", () => {
    expect(variance([5, 5, 5, 5])).toBe(0);
  });

  it("computes skewness correctly", () => {
    // Symmetric distribution has ~0 skewness
    const s = skewness([1, 2, 3, 4, 5]);
    expect(Math.abs(s)).toBeLessThan(0.01);
  });

  it("computes positive skewness for right-skewed data", () => {
    const s = skewness([1, 1, 1, 1, 1, 1, 1, 10]);
    expect(s).toBeGreaterThan(0);
  });

  it("computes kurtosis for normal-like data", () => {
    // Excess kurtosis near 0 for normal-like data
    const k = kurtosis([2, 3, 4, 4, 5, 5, 5, 6, 6, 7, 7, 8]);
    expect(Math.abs(k)).toBeLessThan(2);
  });

  it("condense returns all four stats", () => {
    const result = condense([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(result.mean).toBeCloseTo(5.5);
    expect(result.variance).toBeGreaterThan(0);
    expect(typeof result.skewness).toBe("number");
    expect(typeof result.kurtosis).toBe("number");
  });

  it("handles edge cases", () => {
    expect(variance([1])).toBe(0);
    expect(skewness([1, 2])).toBe(0);
    expect(kurtosis([1, 2, 3])).toBe(0);
  });
});
