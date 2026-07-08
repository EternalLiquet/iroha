import { randomUUID } from "crypto";
import type { BrainResponse, ChatEvent } from "@iroha/shared-schema";
import type { BrainClient } from "./brain-client";
import type { ChatSource } from "./chat-source";
import {
  decideResponse,
  type DeciderConfig,
  type DeciderState,
} from "./decider";

export type StructuredLogFields = Record<string, unknown>;
export type StructuredLog = (
  event: string,
  fields: StructuredLogFields,
) => void;

export type OrchestratorRuntime = {
  nowMs: () => number;
  nowPerfMs: () => number;
  requestId: () => string;
  sleep: (ms: number) => Promise<void>;
};

export type OrchestratorConsole = {
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

export type RunOrchestratorOptions = {
  brainUrl: string;
  brainClient: BrainClient;
  chatSource: ChatSource;
  deciderConfig: DeciderConfig;
  deciderState?: DeciderState;
  label?: string;
  eventDelayMs?: number;
  runtime?: Partial<OrchestratorRuntime>;
  logStructured?: StructuredLog;
  console?: OrchestratorConsole;
};

export type RunOrchestratorResult = {
  processedEvents: number;
  brainCalls: number;
  skippedEvents: number;
};

const DEFAULT_EVENT_DELAY_MS = 250;

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultStructuredLog(event: string, fields: StructuredLogFields): void {
  console.log(JSON.stringify({ event, ...fields }));
}

function printBrainResponse(
  output: OrchestratorConsole,
  latencyMs: number,
  brainResponse: BrainResponse,
): void {
  output.log("[brain]", {
    latencyMs,
    reply_text: brainResponse.reply_text,
    should_speak: brainResponse.should_speak,
    emotion: brainResponse.emotion,
    intensity: brainResponse.intensity,
    safe: brainResponse.safe,
    refusal_reason: brainResponse.refusal_reason,
  });
}

export async function runOrchestrator(
  options: RunOrchestratorOptions,
): Promise<RunOrchestratorResult> {
  const label = options.label ?? "orchestrator";
  const output = options.console ?? console;
  const logStructured = options.logStructured ?? defaultStructuredLog;
  const eventDelayMs = options.eventDelayMs ?? DEFAULT_EVENT_DELAY_MS;
  const runtime: OrchestratorRuntime = {
    nowMs: options.runtime?.nowMs ?? Date.now,
    nowPerfMs: options.runtime?.nowPerfMs ?? performance.now.bind(performance),
    requestId: options.runtime?.requestId ?? randomUUID,
    sleep: options.runtime?.sleep ?? defaultSleep,
  };

  const deciderState: DeciderState = options.deciderState ?? {
    lastResponseAtMs: null,
  };

  const result: RunOrchestratorResult = {
    processedEvents: 0,
    brainCalls: 0,
    skippedEvents: 0,
  };

  output.log(`[${label}] demo started with brain URL:`, options.brainUrl);
  output.log(`[${label}] decider config:`, options.deciderConfig);
  output.log(`[${label}] chat source:`, options.chatSource.name);

  for await (const event of options.chatSource.events()) {
    result.processedEvents += 1;

    const nowMs = runtime.nowMs();
    const decision = decideResponse(
      event,
      nowMs,
      deciderState,
      options.deciderConfig,
    );

    const decisionLog = {
      user_id: event.user_id,
      username: event.username,
      message_chars: event.message.length,
      timestamp_ms: event.timestamp_ms,
      should_respond: decision.shouldRespond,
      reason: decision.reason,
      cooldown_ms: options.deciderConfig.cooldownMs,
      min_message_chars: options.deciderConfig.minMessageChars,
      respond_probability: options.deciderConfig.respondProbability,
    };

    if (!decision.shouldRespond) {
      result.skippedEvents += 1;
      logStructured("decider_decision", decisionLog);
      await runtime.sleep(eventDelayMs);
      continue;
    }

    const requestId = runtime.requestId();

    logStructured("decider_decision", {
      ...decisionLog,
      request_id: requestId,
    });

    const startedMs = runtime.nowMs();
    const startedPerfMs = runtime.nowPerfMs();
    let ok = false;

    try {
      const brainResponse = await options.brainClient.generate(
        requestId,
        event,
      );
      const latencyMs = runtime.nowMs() - startedMs;

      ok = true;
      result.brainCalls += 1;
      deciderState.lastResponseAtMs = nowMs;

      printBrainResponse(output, latencyMs, brainResponse);
    } catch (err) {
      output.error(
        `[${label}] error calling brain /generate:`,
        err,
        "event:",
        event,
      );
    } finally {
      logStructured("brain_call_latency", {
        request_id: requestId,
        user_id: event.user_id,
        username: event.username,
        latency_ms: Math.round(runtime.nowPerfMs() - startedPerfMs),
        ok,
      });
    }

    await runtime.sleep(eventDelayMs);
  }

  output.log(`[${label}] demo finished`);
  return result;
}
