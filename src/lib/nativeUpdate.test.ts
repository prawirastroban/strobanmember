import { describe, expect, it } from "vitest";
import { requiresNativeUpdate } from "./nativeUpdate";

describe("update enforcement", () => {
  it("never locks native apps below minimum or on force releases", () => {
    expect(requiresNativeUpdate(true, true, true, true)).toBe(false);
    expect(requiresNativeUpdate(true, true, false, false)).toBe(false);
  });
  it("never locks the web", () => {
    expect(requiresNativeUpdate(false, true, true, true)).toBe(false);
  });
});
