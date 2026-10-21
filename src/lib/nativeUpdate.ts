/** Version locks are disabled: updates are always optional (web publish / Google Play). */
export function requiresNativeUpdate(_native: boolean, _belowMinimum: boolean, _force: boolean, _available: boolean): boolean {
  return false;
}
