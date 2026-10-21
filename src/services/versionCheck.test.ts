import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/versionRegistry", () => ({ getVersionRegistry: vi.fn() }));
vi.mock("@/lib/platform", () => ({ isNative: () => false }));

import { computeUpdateAvailable } from "./versionCheck";

describe("Android update detection", () => {
  it("Play Store app 3.0.6 build 282 sees no update when the latest release is 3.0.6 build 282", () => {
    expect(computeUpdateAvailable("3.0.6", "3.0.6", 282, 282)).toBe(false);
  });
  it("a release without a build number never counts as newer", () => {
    expect(computeUpdateAvailable("3.0.6", "3.0.4", 282, null)).toBe(false);
  });
});
