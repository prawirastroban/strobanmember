/**
 * Deprecated: Android Google login now uses the native GoogleAuth plugin
 * (no Chrome Custom Tab, no deep link round trip), so the OAuth deep-link
 * bridge is unnecessary. Kept as a no-op stub so existing imports keep
 * working without runtime side effects.
 */
const NativeAuthBridge = () => null;

export default NativeAuthBridge;