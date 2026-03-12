import "dotenv/config";
import { randomUUID } from "crypto";
import { decideResponse, type DeciderState } from "./decider";
import { loadDeciderConfig } from "./config";
import {
  BrainGenerateRequestSchema,
  BrainResponseSchema,
  ChatEventSchema,
  type BrainGenerateRequest,
  type BrainResponse,
  type ChatEvent,
} from "@iroha/shared-schema";
import { json } from "zod/v4/mini";

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

type StructuredLogFields = Record<string, unknown>;

function logStructured(event: string, fields: StructuredLogFields): void {
  console.log(JSON.stringify({ event, ...fields }));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callBrainGenerate(
  requestId: string,
  event: ChatEvent,
): Promise<BrainResponse> {
  const request: BrainGenerateRequest = BrainGenerateRequestSchema.parse({
    request_id: requestId,
    ...event,
  });

  const startedAt = performance.now();
  let ok = false;

  try {
    const response = await fetch(GENERATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw new Error(
        `Brain /generate failed: ${response.status} ${response.statusText} - ${bodyText}`,
      );
    }

    const payload = await response.json();
    const parsed = BrainResponseSchema.parse(payload);

    ok = true;
    return parsed;
  } finally {
    logStructured("brain_call_latency", {
      request_id: requestId,
      user_id: event.user_id,
      username: event.username,
      latency_ms: Math.round(performance.now() - startedAt),
      ok,
    });
  }
}

async function main(): Promise<void> {
  console.log("[demo] demo started with brain URL:", BRAIN_URL);
  console.log("[demo] decider config:", deciderConfig);

  for (const rawEvent of demoEventsRaw) {
    const event = ChatEventSchema.parse(rawEvent);

    const nowMs = Date.now();
    const decision = decideResponse(event, nowMs, deciderState, deciderConfig);

    const decisionLog = {
      user_id: event.user_id,
      username: event.username,
      message_chars: event.message.length,
      timestamp_ms: event.timestamp_ms,
      should_respond: decision.shouldRespond,
      reason: decision.reason,
      cooldown_ms: deciderConfig.cooldownMs,
      min_message_chars: deciderConfig.minMessageChars,
      respond_probability: deciderConfig.respondProbability,
    };

    if (!decision.shouldRespond) {
      logStructured("decider_decision", decisionLog);
      await sleep(250);
      continue;
    }

    const requestId = randomUUID();

    logStructured("decider_decision", {
      ...decisionLog,
      request_id: requestId,
    });

    try {
      const started = Date.now();
      const brainResponse = await callBrainGenerate(requestId, event);
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
