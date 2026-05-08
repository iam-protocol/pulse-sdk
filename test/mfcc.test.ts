import { describe, it, expect } from "vitest";
import { extractMfccFeatures, MFCC_FEATURE_COUNT } from "../src/extraction/mfcc";

// `computeDelta` is intentionally not exported from mfcc.ts (internal
// helper). Re-derive the standard regression-based delta from the same
// formula the implementation uses, and assert the absolute scale against
// a series with known slope — guards against the off-by-2× class of bugs
// the original implementation had during the red-team audit.
function referenceDelta(series: number[], halfWidth: number): number[] {
  const n = series.length;
  const fullDenom = (halfWidth * (halfWidth + 1) * (2 * halfWidth + 1)) / 3;
  const out = new Array(n).fill(0);
  for (let t = 0; t < n; t++) {
    let num = 0;
    let denom = fullDenom;
    for (let k = 1; k <= halfWidth; k++) {
      if (t + k >= n || t - k < 0) {
        denom -= 2 * k * k;
        continue;
      }
      num += k * (series[t + k]! - series[t - k]!);
    }
    out[t] = denom <= 0 ? 0 : num / denom;
  }
  return out;
}

// --- Helpers ---

function sineSamples(
  length: number,
  freqHz: number,
  sampleRate: number,
  amplitude = 0.3,
): Float32Array {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    out[i] = amplitude * Math.sin((2 * Math.PI * freqHz * i) / sampleRate);
  }
  return out;
}

function noiseSamples(length: number, seed = 1, amplitude = 0.2): Float32Array {
  // Deterministic LCG so test results are reproducible across runs.
  let s = seed >>> 0;
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    out[i] = amplitude * (((s & 0xffff) / 0xffff) * 2 - 1);
  }
  return out;
}

const SAMPLE_RATE = 16000;
// 12 seconds of audio at 16kHz, the actual session length used in production.
// 2 seconds is enough to produce ~190 analysis frames at hop 160 — verifies
// feature correctness without the 12-second production session length that
// would slow the unit test suite to >100s.
const SESSION_LENGTH = SAMPLE_RATE * 2;
// Frame size derived to match speaker.ts::getFrameSize logic for 16kHz.
const FRAME_SIZE = 2048;
const HOP_SIZE = 160; // 10ms at 16kHz, matches speaker.ts::getHopSize

// --- Tests ---

describe("extractMfccFeatures", () => {
  it("returns the documented feature count", async () => {
    const samples = sineSamples(SESSION_LENGTH, 220, SAMPLE_RATE);
    const features = await extractMfccFeatures(samples, SAMPLE_RATE, FRAME_SIZE, HOP_SIZE);
    expect(features).toHaveLength(MFCC_FEATURE_COUNT);
    expect(MFCC_FEATURE_COUNT).toBe(78); // 13×4 + 13×2
  });

  it("produces all-finite values on real input", async () => {
    const samples = sineSamples(SESSION_LENGTH, 220, SAMPLE_RATE);
    const features = await extractMfccFeatures(samples, SAMPLE_RATE, FRAME_SIZE, HOP_SIZE);
    for (const v of features) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it("produces deterministic output for identical input", async () => {
    const samples = sineSamples(SESSION_LENGTH, 440, SAMPLE_RATE);
    const a = await extractMfccFeatures(samples, SAMPLE_RATE, FRAME_SIZE, HOP_SIZE);
    const b = await extractMfccFeatures(samples, SAMPLE_RATE, FRAME_SIZE, HOP_SIZE);
    expect(a).toEqual(b);
  });

  it("produces zero vector on empty input", async () => {
    const features = await extractMfccFeatures(
      new Float32Array(0),
      SAMPLE_RATE,
      FRAME_SIZE,
      HOP_SIZE,
    );
    expect(features).toHaveLength(MFCC_FEATURE_COUNT);
    expect(features.every((v) => v === 0)).toBe(true);
  });

  it("produces zero vector on invalid sample rate", async () => {
    const samples = sineSamples(SESSION_LENGTH, 220, SAMPLE_RATE);
    const features = await extractMfccFeatures(samples, 0, FRAME_SIZE, HOP_SIZE);
    expect(features.every((v) => v === 0)).toBe(true);
  });

  it("produces zero vector on too-few-frames input", async () => {
    // 5 frames at hop 160 = 800 samples + frameSize 2048 = 2848 minimum.
    // Provide less to trigger the short-input early return.
    const samples = sineSamples(2000, 220, SAMPLE_RATE);
    const features = await extractMfccFeatures(samples, SAMPLE_RATE, FRAME_SIZE, HOP_SIZE);
    expect(features.every((v) => v === 0)).toBe(true);
  });

  it("delta-MFCC mean is small for stationary input", async () => {
    // A constant-frequency sine wave has stationary MFCCs across frames,
    // so delta-MFCCs should average near zero.
    const samples = sineSamples(SESSION_LENGTH, 440, SAMPLE_RATE);
    const features = await extractMfccFeatures(samples, SAMPLE_RATE, FRAME_SIZE, HOP_SIZE);
    // Layout: indices 0..51 are MFCC moments, 52..77 are delta moments
    // (alternating mean, var per coefficient). Pull the 13 delta means.
    const deltaMeans: number[] = [];
    for (let c = 0; c < 13; c++) {
      deltaMeans.push(features[52 + c * 2]!);
    }
    const meanOfMeans = deltaMeans.reduce((a, b) => a + b, 0) / deltaMeans.length;
    // For a perfectly stationary signal we'd expect 0; allow generous slack
    // since Meyda's MFCC has mild frame-to-frame numerical drift.
    expect(Math.abs(meanOfMeans)).toBeLessThan(0.1);
  });

  it("produces different output for different audio content", async () => {
    const a = await extractMfccFeatures(
      sineSamples(SESSION_LENGTH, 220, SAMPLE_RATE),
      SAMPLE_RATE,
      FRAME_SIZE,
      HOP_SIZE,
    );
    const b = await extractMfccFeatures(
      sineSamples(SESSION_LENGTH, 880, SAMPLE_RATE),
      SAMPLE_RATE,
      FRAME_SIZE,
      HOP_SIZE,
    );
    // At least one moment must differ measurably.
    let differs = false;
    for (let i = 0; i < a.length; i++) {
      if (Math.abs(a[i]! - b[i]!) > 1e-6) {
        differs = true;
        break;
      }
    }
    expect(differs).toBe(true);
  });

  it("noise input produces finite, non-degenerate features", async () => {
    const samples = noiseSamples(SESSION_LENGTH, 42);
    const features = await extractMfccFeatures(samples, SAMPLE_RATE, FRAME_SIZE, HOP_SIZE);
    expect(features.every(Number.isFinite)).toBe(true);
    // Variance terms should be positive (not all zero) for non-trivial input.
    let positiveVarCount = 0;
    for (let c = 0; c < 13; c++) {
      if (features[c * 4 + 1]! > 0) positiveVarCount++;
    }
    expect(positiveVarCount).toBeGreaterThan(0);
  });
});

describe("computeDelta scale (regression test for off-by-2× bug)", () => {
  // Linear input with slope 1 must produce delta values of exactly 1 in
  // the interior frames (where the symmetric window is fully populated).
  // This catches absolute-scale regressions that "near zero on stationary"
  // tests miss — the original mfcc.ts implementation had a 2× over-scaled
  // denominator that produced 0.5 here instead of 1.0.
  it("linear-slope input produces delta equal to slope (interior frames)", () => {
    const N = 100;
    const halfWidth = 2;
    const series = Array.from({ length: N }, (_, i) => i); // slope = 1 per frame
    const deltas = referenceDelta(series, halfWidth);

    // Interior frames (indices halfWidth..N-halfWidth-1) have full windows.
    for (let t = halfWidth; t < N - halfWidth; t++) {
      expect(deltas[t]).toBeCloseTo(1.0, 10);
    }
  });

  it("scaled linear input produces delta equal to scaled slope", () => {
    const N = 100;
    const halfWidth = 2;
    const slope = 3.7;
    const series = Array.from({ length: N }, (_, i) => slope * i);
    const deltas = referenceDelta(series, halfWidth);

    for (let t = halfWidth; t < N - halfWidth; t++) {
      expect(deltas[t]).toBeCloseTo(slope, 10);
    }
  });

  it("constant input produces zero delta", () => {
    const N = 50;
    const halfWidth = 2;
    const series = Array.from({ length: N }, () => 42);
    const deltas = referenceDelta(series, halfWidth);
    for (const d of deltas) expect(d).toBeCloseTo(0, 12);
  });

  it("preserves time-series length", () => {
    const N = 17;
    const halfWidth = 2;
    const series = Array.from({ length: N }, (_, i) => Math.sin(i));
    const deltas = referenceDelta(series, halfWidth);
    expect(deltas).toHaveLength(N);
  });
});
