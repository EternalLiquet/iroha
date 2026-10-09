import { afterEach, describe, expect, it } from "vitest";
import { loadBrainTimeoutMs, loadDeciderConfig } from "../config";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("loadDeciderConfig", () => {
  it("uses defaults when env is missing", () => {
    delete process.env.DECIDER_COOLDOWN_MS;
    delete process.env.DECIDER_MIN_MESSAGE_CHARS;
    delete process.env.DECIDER_RESPOND_PROBABILITY;

    const cfg = loadDeciderConfig();

    expect(cfg).toEqual({
      cooldownMs: 6000,
      minMessageChars: 3,
      respondProbability: 0.6,
    });
  });

  it("parses valid env values", () => {
    process.env.DECIDER_COOLDOWN_MS = "2500";
    process.env.DECIDER_MIN_MESSAGE_CHARS = "5";
    process.env.DECIDER_RESPOND_PROBABILITY = "0.85";

    const cfg = loadDeciderConfig();

    expect(cfg).toEqual({
      cooldownMs: 2500,
      minMessageChars: 5,
      respondProbability: 0.85,
    });
  });

  it("falls back for invalid numeric env values", () => {
    process.env.DECIDER_COOLDOWN_MS = "abc";
    process.env.DECIDER_MIN_MESSAGE_CHARS = "xyz";
    process.env.DECIDER_RESPOND_PROBABILITY = "nope";

    const cfg = loadDeciderConfig();

    expect(cfg).toEqual({
      cooldownMs: 6000,
      minMessageChars: 3,
      respondProbability: 0.6,
    });
  });

  it("clamps probability to [0, 1]", () => {
    process.env.DECIDER_RESPOND_PROBABILITY = "-1";
    expect(loadDeciderConfig().respondProbability).toBe(0);

    process.env.DECIDER_RESPOND_PROBABILITY = "2";
    expect(loadDeciderConfig().respondProbability).toBe(1);
  });

  it("enforces non-negative cooldown and min message >= 1", () => {
    process.env.DECIDER_COOLDOWN_MS = "-10";
    process.env.DECIDER_MIN_MESSAGE_CHARS = "0";

    const cfg = loadDeciderConfig();

    expect(cfg.cooldownMs).toBe(0);
    expect(cfg.minMessageChars).toBe(1);
  });
});

describe("loadBrainTimeoutMs", () => {
  it("uses a 30 second default and accepts a positive integer override", () => {
    delete process.env.BRAIN_TIMEOUT_MS;
    expect(loadBrainTimeoutMs()).toBe(30_000);
    process.env.BRAIN_TIMEOUT_MS = "1200";
    expect(loadBrainTimeoutMs()).toBe(1200);
  });

  it.each(["0", "-1", "1.5", "12ms", "Infinity", "abc", "2147483648"])(
    "rejects invalid timeout %s",
    (value) => {
      process.env.BRAIN_TIMEOUT_MS = value;
      expect(() => loadBrainTimeoutMs()).toThrow(/BRAIN_TIMEOUT_MS/);
    },
  );
});
