import {
  ChatEventSchema,
  type ChatEvent,
} from "@iroha/shared-schema";

export interface ChatSource {
  readonly name: string;
  events(): AsyncIterable<ChatEvent>;
}

export function createDefaultDemoEvents(startTimestampMs = Date.now()): readonly unknown[] {
  return [
    {
      user_id: "u1",
      username: "alice",
      message: "hi iroha!",
      timestamp_ms: startTimestampMs,
    },
    {
      user_id: "u2",
      username: "bob",
      message: "yo",
      timestamp_ms: startTimestampMs + 1000,
    },
    {
      user_id: "u3",
      username: "charlie",
      message: "what are you up to today?",
      timestamp_ms: startTimestampMs + 2000,
    },
    {
      user_id: "u4",
      username: "dana",
      message: "tell me a quick fun fact",
      timestamp_ms: startTimestampMs + 3000,
    },
  ] as const;
}

export class DemoChatSource implements ChatSource {
  readonly name = "demo";

  constructor(
    private readonly rawEvents: readonly unknown[] = createDefaultDemoEvents(),
  ) {}

  async *events(): AsyncIterable<ChatEvent> {
    for (const rawEvent of this.rawEvents) {
      yield ChatEventSchema.parse(rawEvent);
    }
  }
}
