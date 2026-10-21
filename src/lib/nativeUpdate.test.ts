import { describe, expect, it } from "vitest";
import { requiresNativeUpdate } from "./nativeUpdate";

describe("native update enforcement", () => {
  it("offers an update below minimum even without a newer registry release", () => {
    expect(requiresNativeUpdate(true, true, false, false)).toBe(true);
  });
  it("does not block the web for Android releases", () => {
    expect(requiresNativeUpdate(false, true, true, true)).toBe(false);
  });
  it("does not lock an up-to-date native app for a force release", () => {
    expect(requiresNativeUpdate(true, false, true, false)).toBe(false);
  });
  it("requires an available forced native update", () => {
    expect(requiresNativeUpdate(true, false, true, true)).toBe(true);
    expect(requiresNativeUpdate(true, false, false, true)).toBe(false);
  });
});