import { z } from "zod";

export const BrainResponseSchema = z
  .object({
    reply_text: z.string(),
    should_speak: z.boolean(),
    emotion: z.string(),
    intensity: z.number(),
    safe: z.boolean(),
    refusal_reason: z.string().nullable(),
  })
  .strict();

export type BrainResponse = z.infer<typeof BrainResponseSchema>;

export const ChatEventSchema = z
  .object({
    user_id: z.string(),
    username: z.string(),
    message: z.string(),
    timestamp_ms: z.number().int().nonnegative(),
  })
  .strict();

export type ChatEvent = z.infer<typeof ChatEventSchema>;
