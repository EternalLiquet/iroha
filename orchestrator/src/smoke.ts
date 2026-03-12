import "dotenv/config";
import { randomUUID } from "node:crypto";
import {
  BrainGenerateRequestSchema,
  BrainResponseSchema,
  ChatEventSchema,
  type BrainResponse,
  type ChatEvent,
} from "@iroha/shared-schema";
import {
  decideResponse,
  type DeciderConfig,
  type DecisionReason,
  type DeciderState,
} from "./decider";

const BRAIN_URL = process.env.BRAIN_URL ?? "http://127.0.0.1:8001";
const HEALTH_URL = `${BRAIN_URL}/health`;
const GENERATE_URL = `${BRAIN_URL}/generate`;

type SmokeCase = {
  name: string;
  event: ChatEvent;
  expectedShouldRespond: boolean;
  expectedReason: DecisionReason;
  expectBrainCall: boolean;
};

type CheckResult = {
  name: string;
  ok: boolean;
  details?: string;
};

const smokeConfig: DeciderConfig = {
  cooldownMs: 5_000,
  minMessageChars: 3,
  respondProbability: 1,
};

const smokeCases: readonly SmokeCase[] = [
  {
    name: "first valid message responds",
    event: {
      user_id: "smoke-u1",
      username: "alice",
      message: "hi iroha!",
      timestamp_ms: 10_000,
    },
    expectedShouldRespond: true,
    expectedReason: "respond",
    expectBrainCall: true,
  },
  {
    name: "short message is rejected",
    event: {
      user_id: "smoke-u2",
      username: "bob",
      message: "yo",
      timestamp_ms: 11_000,
    },
    expectedShouldRespond: false,
    expectedReason: "too_short",
    expectBrainCall: false,
  },
  {
    name: "cooldown suppresses second valid message",
    event: {
      user_id: "smoke-u3",
      username: "charlie",
      message: "what are you up to today?",
      timestamp_ms: 12_000,
    },
    expectedShouldRespond: false,
    expectedReason: "cooldown",
    expectBrainCall: false,
  },
  {
    name: "post-cooldown valid message responds",
    event: {
      user_id: "smoke-u4",
      username: "dana",
      message: "tell me a quick fun fact",
      timestamp_ms: 16_001,
    },
    expectedShouldRespond: true,
    expectedReason: "respond",
    expectBrainCall: true,
  },
] as const;

function printCheck(result: CheckResult): void {
  const status = result.ok ? "PASS" : "FAIL";
  const suffix = result.details ? ` - ${result.details}` : "";
  console.log(`[${status}] ${result.name}${suffix}`);
}

async function checkBrainHealth(): Promise<CheckResult> {
  try {
    const response = await fetch(HEALTH_URL);

    if (!response.ok) {
      return {
        name: "brain health check",
        ok: false,
        details: `HTTP ${response.status}`,
      };
    }

    return { name: "brain health check", ok: true };
  } catch (error) {
    return {
      name: "brain health check",
      ok: false,
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

async function callBrain(event: ChatEvent): Promise<CheckResult> {
  const request = BrainGenerateRequestSchema.parse({
    request_id: randomUUID(),
    ...event,
  });

  try {
    const response = await fetch(GENERATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      return {
        name: `brain response schema: ${event.username}`,
        ok: false,
        details: `HTTP ${response.status}`,
      };
    }

    const payload: unknown = await response.json();
    const parsed = BrainResponseSchema.safeParse(payload);

    if (!parsed.success) {
      return {
        name: `brain response schema: ${event.username}`,
        ok: false,
        details: JSON.stringify(parsed.error.issues),
      };
    }

    return validateBrainResponse(
      `brain response schema: ${event.username}`,
      parsed.data,
    );
  } catch (error) {
    return {
      name: `brain response schema: ${event.username}`,
      ok: false,
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

function validateBrainResponse(
  name: string,
  response: BrainResponse,
): CheckResult {
  if (typeof response.reply_text !== "string") {
    return { name, ok: false, details: "reply_text is not a string" };
  }

  if (typeof response.should_speak !== "boolean") {
    return { name, ok: false, details: "should_speak is not a boolean" };
  }

  if (typeof response.emotion !== "string") {
    return { name, ok: false, details: "emotion is not a string" };
  }

  if (typeof response.intensity !== "number") {
    return { name, ok: false, details: "intensity is not a number" };
  }

  if (typeof response.safe !== "boolean") {
    return { name, ok: false, details: "safe is not a boolean" };
  }

  if (
    response.refusal_reason !== null &&
    typeof response.refusal_reason !== "string"
  ) {
    return { name, ok: false, details: "refusal_reason has invalid type" };
  }

  return { name, ok: true };
}

function evaluateDecision(
  name: string,
  shouldRespond: boolean,
  reason: DecisionReason,
  expectedShouldRespond: boolean,
  expectedReason: DecisionReason,
): CheckResult {
  const ok =
    shouldRespond === expectedShouldRespond && reason === expectedReason;

  if (ok) {
    return { name, ok: true };
  }

  return {
    name,
    ok: false,
    details: `expected shouldRespond=${expectedShouldRespond}, reason=${expectedReason}; got shouldRespond=${shouldRespond}, reason=${reason}`,
  };
}

async function main(): Promise<void> {
  const results: CheckResult[] = [];
  const deciderState: DeciderState = {
    lastResponseAtMs: null,
  };

  const health = await checkBrainHealth();
  results.push(health);
  printCheck(health);

  if (!health.ok) {
    printSummary(results);
    process.exitCode = 1;
    return;
  }

  for (const testCase of smokeCases) {
    const event = ChatEventSchema.parse(testCase.event);
    const nowMs = event.timestamp_ms;
    const decision = decideResponse(event, nowMs, deciderState, smokeConfig);

    const decisionResult = evaluateDecision(
      `decider: ${testCase.name}`,
      decision.shouldRespond,
      decision.reason,
      testCase.expectedShouldRespond,
      testCase.expectedReason,
    );

    results.push(decisionResult);
    printCheck(decisionResult);

    if (!decision.shouldRespond || !testCase.expectBrainCall) {
      continue;
    }

    deciderState.lastResponseAtMs = event.timestamp_ms;

    const brainResult = await callBrain(event);
    results.push(brainResult);
    printCheck(brainResult);
  }

  printSummary(results);

  if (results.some((result) => !result.ok)) {
    process.exitCode = 1;
  }
}

function printSummary(results: readonly CheckResult[]): void {
  const passed = results.filter((result) => result.ok).length;
  const failed = results.length - passed;

  console.log("");
  console.log("Smoke summary");
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${results.length}`);
}

main().catch((error: unknown) => {
  const details = error instanceof Error ? error.message : String(error);
  printCheck({
    name: "smoke runner",
    ok: false,
    details,
  });
  printSummary([{ name: "smoke runner", ok: false, details }]);
  process.exitCode = 1;
});
