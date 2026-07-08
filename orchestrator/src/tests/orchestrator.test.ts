import { describe, expect, it } from "vitest";
import type { BrainResponse, ChatEvent } from "@iroha/shared-schema";
import type { BrainClient } from "../brain-client";
import type { ChatSource } from "../chat-source";
import type { DeciderConfig, DeciderState } from "../decider";
import { runOrchestrator, type StructuredLogFields } from "../orchestrator";

const RESPOND_CFG: DeciderConfig = {
  cooldownMs: 0,
  minMessageChars: 3,
  respondProbability: 1,
};

const BASE_RESPONSE: BrainResponse = {
  reply_text: "Hello there.",
  should_speak: true,
  emotion: "neutral",
  intensity: 0.5,
  safe: true,
  refusal_reason: null,
};

class StaticChatSource implements ChatSource {
  readonly name = "test";

  constructor(private readonly chatEvents: readonly ChatEvent[]) {}

  async *events(): AsyncIterable<ChatEvent> {
    yield* this.chatEvents;
  }
}

class RecordingBrainClient implements BrainClient {
  readonly calls: { requestId: string; event: ChatEvent }[] = [];

  constructor(private readonly response: BrainResponse = BASE_RESPONSE) {}

  async generate(requestId: string, event: ChatEvent): Promise<BrainResponse> {
    this.calls.push({ requestId, event });
    return this.response;
  }
}

class FailingBrainClient implements BrainClient {
  async generate(): Promise<BrainResponse> {
    throw new Error("brain unavailable");
  }
}

function chatEvent(message: string): ChatEvent {
  return {
    user_id: "u1",
    username: "tester",
    message,
    timestamp_ms: 10_000,
  };
}

function createRuntime() {
  let nowMs = 10_000;
  let perfMs = 100;

  return {
    nowMs: () => {
      nowMs += 5;
      return nowMs;
    },
    nowPerfMs: () => {
      perfMs += 7;
      return perfMs;
    },
    requestId: () => "request-1",
    sleep: async () => {},
  };
}

describe("runOrchestrator", () => {
  it("calls brain for responding events and skips rejected events", async () => {
    const brainClient = new RecordingBrainClient();
    const logs: { event: string; fields: StructuredLogFields }[] = [];
    const source = new StaticChatSource([
      chatEvent("hello there"),
      chatEvent("yo"),
    ]);

    const result = await runOrchestrator({
      brainUrl: "http://brain.test",
      brainClient,
      chatSource: source,
      deciderConfig: RESPOND_CFG,
      eventDelayMs: 0,
      runtime: createRuntime(),
      logStructured: (event, fields) => logs.push({ event, fields }),
      console: {
        log: () => {},
        error: () => {},
      },
    });

    expect(result).toEqual({
      processedEvents: 2,
      brainCalls: 1,
      skippedEvents: 1,
    });

    expect(brainClient.calls).toEqual([
      {
        requestId: "request-1",
        event: chatEvent("hello there"),
      },
    ]);

    expect(logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: "decider_decision",
          fields: expect.objectContaining({
            request_id: "request-1",
            should_respond: true,
            reason: "respond",
          }),
        }),
        expect.objectContaining({
          event: "decider_decision",
          fields: expect.objectContaining({
            should_respond: false,
            reason: "too_short",
          }),
        }),
        expect.objectContaining({
          event: "brain_call_latency",
          fields: expect.objectContaining({
            request_id: "request-1",
            ok: true,
          }),
        }),
      ]),
    );
  });

  it("does not advance cooldown state when the brain call fails", async () => {
    const deciderState: DeciderState = { lastResponseAtMs: null };
    const errors: unknown[][] = [];
    const logs: { event: string; fields: StructuredLogFields }[] = [];

    const result = await runOrchestrator({
      brainUrl: "http://brain.test",
      brainClient: new FailingBrainClient(),
      chatSource: new StaticChatSource([chatEvent("hello there")]),
      deciderConfig: RESPOND_CFG,
      deciderState,
      eventDelayMs: 0,
      runtime: createRuntime(),
      logStructured: (event, fields) => logs.push({ event, fields }),
      console: {
        log: () => {},
        error: (...args) => errors.push(args),
      },
    });

    expect(result).toEqual({
      processedEvents: 1,
      brainCalls: 0,
      skippedEvents: 0,
    });
    expect(deciderState.lastResponseAtMs).toBeNull();
    expect(errors).toHaveLength(1);
    expect(logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: "brain_call_latency",
          fields: expect.objectContaining({
            request_id: "request-1",
            ok: false,
          }),
        }),
      ]),
    );
  });
});
