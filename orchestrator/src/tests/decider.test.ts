import { describe, expect, it } from "vitest";
import {
  decideResponse,
  type DeciderConfig,
  type DeciderState,
} from "../decider";
import type { ChatEvent } from "../schema";

const BASE_CFG: DeciderConfig = {
  cooldownMs: 6000,
  minMessageChars: 3,
  respondProbability: 0.6,
};

function mkEvent(message: string): ChatEvent {
  return {
    user_id: "u1",
    username: "tester",
    message,
    timestamp_ms: 1700000000000,
  };
}

describe("decideResponse", () => {
  it("returns too_short for short messages", () => {
    const state: DeciderState = { lastResponseAtMs: null };
    const decision = decideResponse(
      mkEvent("yo"),
      10_000,
      state,
      BASE_CFG,
      () => 0.0,
    );

    expect(decision).toEqual({ shouldRespond: false, reason: "too_short" });
  });

  it("returns cooldown when inside cooldown window", () => {
    const state: DeciderState = { lastResponseAtMs: 10_000 };
    const decision = decideResponse(
      mkEvent("hello there"),
      12_000,
      state,
      BASE_CFG,
      () => 0.0,
    );

    expect(decision).toEqual({ shouldRespond: false, reason: "cooldown" });
  });

  it("returns random_skip when rng is above probability", () => {
    const state: DeciderState = { lastResponseAtMs: null };
    const decision = decideResponse(
      mkEvent("hello there"),
      20_000,
      state,
      BASE_CFG,
      () => 0.95,
    );

    expect(decision).toEqual({ shouldRespond: false, reason: "random_skip" });
  });

  it("returns respond when message is valid, not cooling down, and rng passes", () => {
    const state: DeciderState = { lastResponseAtMs: null };
    const decision = decideResponse(
      mkEvent("hello there"),
      20_000,
      state,
      BASE_CFG,
      () => 0.2,
    );

    expect(decision).toEqual({ shouldRespond: true, reason: "respond" });
  });

  it("allows response exactly at cooldown boundary", () => {
    const state: DeciderState = { lastResponseAtMs: 10_000 };
    const decision = decideResponse(
      mkEvent("boundary test"),
      16_000,
      state,
      BASE_CFG,
      () => 0.2,
    );

    expect(decision).toEqual({ shouldRespond: true, reason: "respond" });
  });
});
