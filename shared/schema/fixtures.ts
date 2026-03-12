export type BrainResponseFixtureCase = {
  name: string;
  payload: unknown;
};

export const validBrainResponseFixtures: readonly BrainResponseFixtureCase[] = [
  {
    name: "minimal valid response",
    payload: {
      reply_text: "Hello there.",
      should_speak: true,
      emotion: "neutral",
      intensity: 0.5,
      safe: true,
      refusal_reason: "",
    },
  },
  {
    name: "normalized single-line response",
    payload: {
      reply_text: "I can answer that briefly and clearly.",
      should_speak: true,
      emotion: "happy",
      intensity: 0.6,
      safe: true,
      refusal_reason: "",
    },
  },
] as const;

export const invalidBrainResponseFixtures: readonly BrainResponseFixtureCase[] =
  [
    {
      name: "missing reply_text",
      payload: {
        should_speak: true,
        emotion: "neutral",
        intensity: 0.5,
        safe: true,
        refusal_reason: "",
      },
    },
    {
      name: "null reply_text",
      payload: {
        reply_text: null,
        should_speak: true,
        emotion: "neutral",
        intensity: 0.5,
        safe: true,
        refusal_reason: "",
      },
    },
    {
      name: "wrong should_speak type",
      payload: {
        reply_text: "Hello there.",
        should_speak: "yes",
        emotion: "neutral",
        intensity: 0.5,
        safe: true,
        refusal_reason: "",
      },
    },
    {
      name: "extra unexpected field",
      payload: {
        reply_text: "Looks valid at first glance.",
        should_speak: true,
        emotion: "neutral",
        intensity: 0.5,
        safe: true,
        refusal_reason: "",
        debug: "should be rejected by strict schema",
      },
    },
  ] as const;
