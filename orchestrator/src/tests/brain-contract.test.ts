import { describe, expect, it } from "vitest";
import {
  BrainResponseSchema,
  invalidBrainResponseFixtures,
  validBrainResponseFixtures,
} from "@iroha/shared-schema";

describe("brain response contract", () => {
  describe("valid fixtures", () => {
    for (const fixture of validBrainResponseFixtures) {
      it(`accepts: ${fixture.name}`, () => {
        const result = BrainResponseSchema.safeParse(fixture.payload);

        expect(
          result.success,
          JSON.stringify(result.error?.issues, null, 2),
        ).toBe(true);
      });
    }
  });

  describe("invalid fixtures", () => {
    for (const fixture of invalidBrainResponseFixtures) {
      it(`rejects: ${fixture.name}`, () => {
        const result = BrainResponseSchema.safeParse(fixture.payload);

        expect(result.success).toBe(false);
      });
    }
  });
});
