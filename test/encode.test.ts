import { describe, expect, it } from "vitest";
import { encodeAudioAsBase64 } from "../src/sensor/encode";

describe("encodeAudioAsBase64", () => {
  it("encodes empty Float32Array to empty base64", () => {
    expect(encodeAudioAsBase64(new Float32Array(0))).toBe("");
  });

  it("encodes a single zero sample to 0x0000 little-endian base64", () => {
    // Int16(0) is [0x00, 0x00]. base64 of two zero bytes is "AAA=".
    expect(encodeAudioAsBase64(Float32Array.of(0))).toBe("AAA=");
  });

  it("encodes max positive sample (1.0) to Int16 0x7FFF", () => {
    // 0x7FFF little-endian = [0xFF, 0x7F]. base64 of [0xFF, 0x7F] = "/38=".
    expect(encodeAudioAsBase64(Float32Array.of(1.0))).toBe("/38=");
  });

  it("encodes max negative sample (-1.0) to Int16 -0x8000", () => {
    // -0x8000 little-endian = [0x00, 0x80]. base64 of [0x00, 0x80] = "AIA=".
    expect(encodeAudioAsBase64(Float32Array.of(-1.0))).toBe("AIA=");
  });

  it("clamps out-of-range values", () => {
    // 1.5 clamps to 1.0 → same as above.
    expect(encodeAudioAsBase64(Float32Array.of(1.5))).toBe("/38=");
    // -2.0 clamps to -1.0 → same as above.
    expect(encodeAudioAsBase64(Float32Array.of(-2.0))).toBe("AIA=");
  });

  it("handles a large Float32Array without stack overflow", () => {
    // 12 seconds at 16kHz = 192K samples. Verify the chunked encoder path
    // does not blow the stack (single-call String.fromCharCode(...) would
    // fail around 128KB of arguments).
    const samples = new Float32Array(192_000);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = Math.sin(i / 100);
    }
    const b64 = encodeAudioAsBase64(samples);
    // Length check: int16 bytes = 384000; base64 ≈ 512000 chars (±2 padding).
    expect(b64.length).toBeGreaterThan(500_000);
    expect(b64.length).toBeLessThan(520_000);
  });

  it("is deterministic for the same input", () => {
    const samples = new Float32Array([0.5, -0.25, 0.75]);
    const a = encodeAudioAsBase64(samples);
    const b = encodeAudioAsBase64(samples);
    expect(a).toBe(b);
  });
});
