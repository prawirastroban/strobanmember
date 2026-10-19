import { afterEach, describe, expect, it, vi } from "vitest";
import { withSpkLoadTimeout } from "./loadTimeout";

afterEach(() => vi.useRealTimers());

describe("SPK loading recovery", () => {
  it("returns an older record without requiring a type or template version", async () => {
    const legacy = { id: "old-spk", data: { customer_name: "Customer" } };
    expect(await withSpkLoadTimeout(Promise.resolve(legacy))).toEqual(legacy);
  });

  it("rejects a stalled read instead of loading indefinitely", async () => {
    vi.useFakeTimers();
    const request = withSpkLoadTimeout(new Promise<never>(() => {}));
    const result = expect(request).rejects.toThrow("Koneksi terlalu lama");
    await vi.advanceTimersByTimeAsync(15000);
    await result;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("propagates read failures and clears the pending timer", async () => {
    vi.useFakeTimers();
    await expect(withSpkLoadTimeout(Promise.reject(new Error("offline")))).rejects.toThrow("offline");
    expect(vi.getTimerCount()).toBe(0);
  });
});