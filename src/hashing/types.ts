/** 256-bit Temporal Fingerprint as an array of 0/1 values */
export type TemporalFingerprint = number[];

/** Temporal-Biometric Hash: commitment + data needed for re-verification */
export interface TBH {
  fingerprint: TemporalFingerprint;
  salt: bigint;
  commitment: bigint;
  commitmentBytes: Uint8Array;
}

/** Packed field elements from bit packing (2 × 128-bit) */
export interface PackedFingerprint {
  lo: bigint;
  hi: bigint;
}
