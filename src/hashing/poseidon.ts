import { BN254_SCALAR_FIELD, FINGERPRINT_BITS } from "../config";
import type { PackedFingerprint, TBH, TemporalFingerprint } from "./types";

// Lazy-initialized Poseidon instance
let poseidonInstance: any = null;

async function getPoseidon(): Promise<any> {
  if (!poseidonInstance) {
    const circomlibjs = await import("circomlibjs");
    poseidonInstance = await (circomlibjs as any).buildPoseidon();
  }
  return poseidonInstance;
}

/**
 * Pack 256-bit fingerprint into two 128-bit field elements.
 * Little-endian bit ordering within each chunk (matches circuit's Bits2Num).
 */
export function packBits(fingerprint: TemporalFingerprint): PackedFingerprint {
  let lo = BigInt(0);
  for (let i = 0; i < 128; i++) {
    if (fingerprint[i] === 1) {
      lo += BigInt(1) << BigInt(i);
    }
  }

  let hi = BigInt(0);
  for (let i = 0; i < 128; i++) {
    if (fingerprint[128 + i] === 1) {
      hi += BigInt(1) << BigInt(i);
    }
  }

  return { lo, hi };
}

/**
 * Compute Poseidon commitment: Poseidon(pack_lo, pack_hi, salt).
 * Matches the circuit's CommitmentCheck template exactly.
 */
export async function computeCommitment(
  fingerprint: TemporalFingerprint,
  salt: bigint
): Promise<bigint> {
  const poseidon = await getPoseidon();
  const { lo, hi } = packBits(fingerprint);
  const hash = poseidon([lo, hi, salt]);
  return poseidon.F.toObject(hash) as bigint;
}

/**
 * Generate a random salt within the BN254 scalar field.
 */
export function generateSalt(): bigint {
  const bytes = new Uint8Array(31);
  crypto.getRandomValues(bytes);
  let val = BigInt(0);
  for (let i = 0; i < bytes.length; i++) {
    val = (val << BigInt(8)) + BigInt(bytes[i] ?? 0);
  }
  return val % BN254_SCALAR_FIELD;
}

/**
 * Convert a BigInt to a 32-byte big-endian Uint8Array.
 */
export function bigintToBytes32(n: bigint): Uint8Array {
  const bytes = new Uint8Array(32);
  let val = n;
  for (let i = 31; i >= 0; i--) {
    bytes[i] = Number(val & BigInt(0xff));
    val >>= BigInt(8);
  }
  return bytes;
}

/**
 * Generate a complete TBH from a fingerprint.
 */
export async function generateTBH(
  fingerprint: TemporalFingerprint,
  salt?: bigint
): Promise<TBH> {
  const s = salt ?? generateSalt();
  const commitment = await computeCommitment(fingerprint, s);
  return {
    fingerprint,
    salt: s,
    commitment,
    commitmentBytes: bigintToBytes32(commitment),
  };
}
