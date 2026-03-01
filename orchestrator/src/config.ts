import type { DeciderConfig } from "./decider";

function parseIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseFloatEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function loadDeciderConfig(): DeciderConfig {
  const cooldownMs = Math.max(0, parseIntEnv("DECIDER_COOLDOWN_MS", 6000));
  const minMessageChars = Math.max(
    1,
    parseIntEnv("DECIDER_MIN_MESSAGE_CHARS", 3),
  );
  const respondProbability = clamp(
    parseFloatEnv("DECIDER_RESPOND_PROBABILITY", 0.6),
    0,
    1,
  );

  return {
    cooldownMs,
    minMessageChars,
    respondProbability,
  };
}
