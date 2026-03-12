import { ChatEvent } from "@iroha/shared-schema";

export type DecisionReason =
  | "respond"
  | "cooldown"
  | "too_short"
  | "random_skip";

export type Decision = {
  shouldRespond: boolean;
  reason: DecisionReason;
};

export type DeciderState = {
  lastResponseAtMs: number | null;
};

export type DeciderConfig = {
  cooldownMs: number;
  minMessageChars: number;
  respondProbability: number; // 0 to 1
};

export const DEFAULT_DECIDER_CONFIG: DeciderConfig = {
  cooldownMs: 6000,
  minMessageChars: 3,
  respondProbability: 0.6,
};

export function decideResponse(
  event: ChatEvent,
  nowMs: number,
  state: DeciderState,
  cfg: DeciderConfig = DEFAULT_DECIDER_CONFIG,
  rng: () => number = Math.random,
): Decision {
  const message = event.message.trim();

  if (message.length < cfg.minMessageChars) {
    return { shouldRespond: false, reason: "too_short" };
  }

  if (
    state.lastResponseAtMs !== null &&
    nowMs - state.lastResponseAtMs < cfg.cooldownMs
  ) {
    return { shouldRespond: false, reason: "cooldown" };
  }

  if (rng() > cfg.respondProbability) {
    return { shouldRespond: false, reason: "random_skip" };
  }

  return { shouldRespond: true, reason: "respond" };
}
