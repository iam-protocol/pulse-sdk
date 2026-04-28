/** Result of a verification submission */
export interface SubmissionResult {
  success: boolean;
  txSignature?: string;
  attestationTx?: string;
  error?: string;
}

/** Result of a full Pulse verification */
export interface VerificationResult {
  success: boolean;
  commitment: Uint8Array;
  txSignature?: string;
  attestationTx?: string;
  isFirstVerification: boolean;
  error?: string;
  /**
   * Reason label when verification fails. Two-source taxonomy:
   *
   * Server-side safe-reveal (validator → executor → SDK):
   *   - `variance_floor`, `entropy_bounds`, `temporal_coupling_low`,
   *     `phrase_content_mismatch`
   *   Surfaced for the soft-reject + retry UX (master-list #94) so the
   *   UI can render a per-category hint.
   *
   * Client-side (SDK-emitted):
   *   - `validation_unavailable` — the relayer's `/validate-features`
   *     endpoint was unreachable (network failure, timeout, abort).
   *     UI should treat as transient + offer retry. NOT a server-side
   *     ReasonCode; emitted directly by `extractFingerprintAndValidate`
   *     when the fetch promise rejects.
   *
   * Absent on every other failure path (data-quality, on-chain submission,
   * baseline missing, etc.) and on attack-signal rejections (TTS detection,
   * Sybil match) and capture-shape bugs — the validator deliberately keeps
   * those opaque to prevent adversarial probing. UI must not assume reason
   * is present even when `success === false`.
   */
  reason?: string;
}
