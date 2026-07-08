import { describe, expect, it } from "vitest";
import {
  createDefaultDemoEvents,
  DemoChatSource,
} from "../chat-source";
import type { ChatEvent } from "@iroha/shared-schema";

async function collectEvents(source: AsyncIterable<ChatEvent>): Promise<ChatEvent[]> {
  const events: ChatEvent[] = [];

  for await (const event of source) {
    events.push(event);
  }

  return events;
}

describe("DemoChatSource", () => {
  it("yields the default demo events in order", async () => {
    const source = new DemoChatSource(createDefaultDemoEvents(10_000));

    await expect(collectEvents(source.events())).resolves.toEqual([
      {
        user_id: "u1",
        username: "alice",
        message: "hi iroha!",
        timestamp_ms: 10_000,
      },
      {
        user_id: "u2",
        username: "bob",
        message: "yo",
        timestamp_ms: 11_000,
      },
      {
        user_id: "u3",
        username: "charlie",
        message: "what are you up to today?",
        timestamp_ms: 12_000,
      },
      {
        user_id: "u4",
        username: "dana",
        message: "tell me a quick fun fact",
        timestamp_ms: 13_000,
      },
    ]);
  });

  it("rejects malformed raw events before they reach orchestration", async () => {
    const source = new DemoChatSource([
      {
        user_id: "u1",
        username: "alice",
        message: "hi iroha!",
        timestamp_ms: -1,
      },
    ]);

    await expect(collectEvents(source.events())).rejects.toThrow();
  });
});
