/** Module-level debug flag, set by PulseSDK constructor. */
let debugEnabled = false;

export function setDebug(enabled: boolean): void {
  debugEnabled = enabled;
}

export function sdkLog(...args: unknown[]): void {
  if (debugEnabled) console.log(...args);
}

export function sdkWarn(...args: unknown[]): void {
  if (debugEnabled) console.warn(...args);
}
