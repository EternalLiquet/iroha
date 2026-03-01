import "dotenv/config";
import { decideResponse, type DeciderState } from "./decider";
import { loadDeciderConfig } from "./config";
import {
  BrainResponseSchema,
  ChatEventSchema,
  type BrainResponse,
  type ChatEvent,
} from "./schema";

const BRAIN_URL = process.env.BRAIN_URL ?? "http://127.0.0.1:8001";
const GENERATE_URL = `${BRAIN_URL}/generate`;

const demoEventsRaw: ChatEvent[] = [
  {
    user_id: "u1",
    username: "alice",
    message: "hi iroha!",
    timestamp_ms: Date.now(),
  },
  {
    user_id: "u2",
    username: "bob",
    message: "yo",
    timestamp_ms: Date.now() + 1000,
  },
  {
    user_id: "u3",
    username: "charlie",
    message: "what are you up to today?",
    timestamp_ms: Date.now() + 2000,
  },
  {
    user_id: "u4",
    username: "dana",
    message: "tell me a quick fun fact",
    timestamp_ms: Date.now() + 3000,
  },
];

const deciderState: DeciderState = {
  lastResponseAtMs: null,
};

const deciderConfig = loadDeciderConfig();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callBrainGenerate(event: ChatEvent): Promise<BrainResponse> {
  const response = await fetch(GENERATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new Error(
      `Brain /generate failed: ${response.status} ${response.statusText} - ${bodyText}`,
    );
  }

  const json = await response.json();
  const parsed = BrainResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(
      `Brain /generate response schema validation failed: ${parsed.error.message} - raw response: ${JSON.stringify(json)}`,
    );
  }
  return parsed.data;
}

async function main(): Promise<void> {
  console.log("[demo] demo started with brain URL:", BRAIN_URL);
  console.log("[demo] decider config:", deciderConfig);

  for (const rawEvent of demoEventsRaw) {
    const eventResult = ChatEventSchema.safeParse(rawEvent);
    if (!eventResult.success) {
      console.error(
        "[demo] invalid event schema, skipping event:",
        rawEvent,
        "error:",
        eventResult.error.flatten(),
      );
      continue;
    }
    const event = eventResult.data;

    const nowMs = Date.now();
    const decision = decideResponse(event, nowMs, deciderState, deciderConfig);

    console.log(`[decider]`, {
      user: event.username,
      shouldRespond: decision.shouldRespond,
      reason: decision.reason,
    });

    if (!decision.shouldRespond) {
      await sleep(250);
      continue;
    }

    try {
      const started = Date.now();
      const brainResponse = await callBrainGenerate(event);
      const latencyMs = Date.now() - started;

      deciderState.lastResponseAtMs = nowMs;

      console.log(`[brain]`, {
        latencyMs,
        reply_text: brainResponse.reply_text,
        should_speak: brainResponse.should_speak,
        emotion: brainResponse.emotion,
        intensity: brainResponse.intensity,
        safe: brainResponse.safe,
        refusal_reason: brainResponse.refusal_reason,
      });
    } catch (err) {
      console.error(
        "[demo] error calling brain /generate:",
        err,
        "event:",
        event,
      );
    }

    await sleep(250);
  }

  console.log("[demo] demo finished");
}

main().catch((err) => {
  console.error("[orchestrator] fatal:", err);
  process.exitCode = 1;
});
