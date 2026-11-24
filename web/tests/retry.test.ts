import { describe, it, expect } from "vitest";
import { isTransient, withRetry } from "../lib/llm/retry";

const overloaded = () => new Error('{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}');
const noSleep = async () => {};

describe("retrying temporary model errors", () => {
  it("recognises overload and rate-limit errors, and nothing else", () => {
    expect(isTransient(overloaded())).toBe(true);
    expect(isTransient(new Error("429 RESOURCE_EXHAUSTED"))).toBe(true);
    expect(isTransient(new Error("fetch failed"))).toBe(true);
    expect(isTransient(new Error('{"error":{"code":404,"message":"model no longer available","status":"NOT_FOUND"}}'))).toBe(false);
    expect(isTransient(new Error("API key not valid"))).toBe(false);
  });
  it("tries again after a temporary error and returns the first success", async () => {
    let calls = 0;
    const waits: number[] = [];
    const out = await withRetry(async () => { if (++calls < 3) throw overloaded(); return "ok"; }, [10, 20, 30], async (ms) => { waits.push(ms); });
    expect(out).toBe("ok");
    expect(calls).toBe(3);
    expect(waits).toEqual([10, 20]);
  });
  it("gives up after the last wait and passes the error on", async () => {
    let calls = 0;
    await expect(withRetry(async () => { calls++; throw overloaded(); }, [1, 1], noSleep)).rejects.toThrow(/high demand/);
    expect(calls).toBe(3);
  });
  it("does not retry an error that would fail the same way again", async () => {
    let calls = 0;
    await expect(withRetry(async () => { calls++; throw new Error("API key not valid"); }, [1, 1], noSleep)).rejects.toThrow(/API key/);
    expect(calls).toBe(1);
  });
});
