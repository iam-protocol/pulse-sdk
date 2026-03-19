import { describe, it, expect } from "vitest";
import {
  computeCommitment,
  generateSalt,
  packBits,
  bigintToBytes32,
  generateTBH,
} from "../src/hashing/poseidon";
import { FINGERPRINT_BITS } from "../src/config";

describe("poseidon", () => {
  const testFingerprint = Array.from({ length: FINGERPRINT_BITS }, (_, i) =>
    i % 3 === 0 ? 1 : 0
  );
  const testSalt = BigInt("12345678901234567890");

  it("packs bits into two 128-bit field elements (little-endian)", () => {
    const bits = new Array(FINGERPRINT_BITS).fill(0);
    bits[0] = 1; // bit 0 → lo = 1
    bits[128] = 1; // bit 128 → hi = 1

    const { lo, hi } = packBits(bits);
    expect(lo).toBe(BigInt(1));
    expect(hi).toBe(BigInt(1));
  });

  it("packs complex bit patterns correctly", () => {
    const bits = new Array(FINGERPRINT_BITS).fill(0);
    bits[0] = 1;
    bits[1] = 1;
    bits[7] = 1;
    // lo should be 1 + 2 + 128 = 131
    const { lo } = packBits(bits);
    expect(lo).toBe(BigInt(131));
  });

  it("computes deterministic commitment", async () => {
    const c1 = await computeCommitment(testFingerprint, testSalt);
    const c2 = await computeCommitment(testFingerprint, testSalt);
    expect(c1).toBe(c2);
  });

  it("different salts produce different commitments", async () => {
    const c1 = await computeCommitment(testFingerprint, testSalt);
    const c2 = await computeCommitment(testFingerprint, testSalt + BigInt(1));
    expect(c1).not.toBe(c2);
  });

  it("different fingerprints produce different commitments", async () => {
    const fp2 = [...testFingerprint];
    fp2[0] = fp2[0] === 1 ? 0 : 1;
    const c1 = await computeCommitment(testFingerprint, testSalt);
    const c2 = await computeCommitment(fp2, testSalt);
    expect(c1).not.toBe(c2);
  });

  it("generates salt within BN254 scalar field", () => {
    const salt = generateSalt();
    expect(salt).toBeGreaterThan(BigInt(0));
    expect(salt).toBeLessThan(
      BigInt(
        "21888242871839275222246405745257275088548364400416034343698204186575808495617"
      )
    );
  });

  it("converts bigint to 32-byte big-endian", () => {
    const bytes = bigintToBytes32(BigInt(256));
    expect(bytes[30]).toBe(1);
    expect(bytes[31]).toBe(0);
    expect(bytes.length).toBe(32);
  });

  it("generates complete TBH", async () => {
    const tbh = await generateTBH(testFingerprint);
    expect(tbh.fingerprint).toEqual(testFingerprint);
    expect(tbh.salt).toBeGreaterThan(BigInt(0));
    expect(tbh.commitment).toBeGreaterThan(BigInt(0));
    expect(tbh.commitmentBytes.length).toBe(32);
  });
});
