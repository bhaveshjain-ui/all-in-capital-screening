// Gemini sometimes answers "503: high demand" or "429: too many requests" for a few seconds. Those are
// temporary and say nothing about the application, so the call is repeated after a short wait. Anything else
// (a bad key, a retired model, a malformed request) is not retried: it would only fail the same way again.

export const RETRY_DELAYS_MS = [3_000, 8_000, 20_000];

const TRANSIENT = /\b(429|500|502|503|504)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|DEADLINE_EXCEEDED|high demand|overloaded|fetch failed|ECONNRESET|ETIMEDOUT|socket hang up/i;

export function isTransient(e: unknown): boolean {
  const text = e instanceof Error ? `${e.name} ${e.message}` : String(e);
  return TRANSIENT.test(text);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  delays: number[] = RETRY_DELAYS_MS,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= delays.length || !isTransient(e)) throw e;
      await sleep(delays[i]);
    }
  }
}
