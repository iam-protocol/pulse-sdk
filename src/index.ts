// Configuration
export type { PulseConfig } from "./config";
export { PROGRAM_IDS, DEFAULT_THRESHOLD, FINGERPRINT_BITS } from "./config";

// Hashing
export type {
  TemporalFingerprint,
  TBH,
  PackedFingerprint,
} from "./hashing/types";
export { simhash, hammingDistance } from "./hashing/simhash";
export {
  computeCommitment,
  generateSalt,
  generateTBH,
  packBits,
  bigintToBytes32,
} from "./hashing/poseidon";

// Feature extraction
export type { StatsSummary, FeatureVector, FusedFeatureVector } from "./extraction/types";
export { mean, variance, skewness, kurtosis, condense, fuseFeatures } from "./extraction/statistics";

// Proof generation
export type {
  SolanaProof,
  CircuitInput,
  ProofResult,
} from "./proof/types";
export { serializeProof, toBigEndian32 } from "./proof/serializer";
export {
  generateProof,
  generateSolanaProof,
  prepareCircuitInput,
} from "./proof/prover";
