export function requiresNativeUpdate(native: boolean, belowMinimum: boolean, force: boolean, available: boolean): boolean {
  return native && (belowMinimum || (force && available));
}