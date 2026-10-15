import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpBrainClient } from "../brain-client";
import type { ChatEvent } from "@iroha/shared-schema";

const EVENT: ChatEvent = {
  user_id: "u1",
  username: "tester",
  message: "hello",
  timestamp_ms: 1,
};

const BRAIN_RESPONSE = {
  reply_text: "Hi",
  emotion: "neutral",
  intensity: 0.5,
  should_speak: true,
  safe: true,
  refusal_reason: null,
};

afterEach(() => vi.useRealTimers());

describe("HttpBrainClient timeout", () => {
  it("aborts and rejects a stalled fetch at the deadline", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const fetchImpl = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      return new Promise<Response>(() => {});
    }) as unknown as typeof fetch;
    const client = new HttpBrainClient("http://brain.test", fetchImpl, 100);

    const result = client.generate("request-1", EVENT);
    const rejection = expect(result).rejects.toThrow(/timed out.*100 ms/i);
    await vi.advanceTimersByTimeAsync(100);

    await rejection;
    expect(signal?.aborted).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("bounds a stalled response body and clears the timer after success", async () => {
    vi.useFakeTimers();
    const body = new ReadableStream({ start() {} });
    let signal: AbortSignal | undefined;
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      return new Response(body);
    }) as unknown as typeof fetch;
    const client = new HttpBrainClient("http://brain.test", fetchImpl, 100);

    const result = client.generate("request-1", EVENT);
    const rejection = expect(result).rejects.toThrow(/timed out.*100 ms/i);
    await vi.advanceTimersByTimeAsync(100);
    await rejection;
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);

    const successFetch = vi.fn(async () =>
      new Response(JSON.stringify(BRAIN_RESPONSE), { status: 200 }),
    ) as unknown as typeof fetch;
    const successClient = new HttpBrainClient("http://brain.test/", successFetch, 100);
    await expect(successClient.generate("request-2", EVENT)).resolves.toEqual(BRAIN_RESPONSE);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("bounds an error response body", async () => {
    vi.useFakeTimers();
    const body = new ReadableStream({ start() {} });
    const fetchImpl = vi.fn(async () => new Response(body, { status: 503 })) as unknown as typeof fetch;
    const client = new HttpBrainClient("http://brain.test", fetchImpl, 100);

    const rejection = expect(client.generate("request-1", EVENT)).rejects.toThrow(/timed out.*100 ms/i);
    await vi.advanceTimersByTimeAsync(100);
    await rejection;
    expect(vi.getTimerCount()).toBe(0);
  });
});
