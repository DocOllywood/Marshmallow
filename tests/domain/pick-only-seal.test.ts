import { describe, expect, it } from "vitest";

import { marshmallowRequiresPrediction } from "@/domain/daily/experiment";

describe("pick-only sealing semantics", () => {
  it("marks experiment instinct stages as pick-only", () => {
    expect(
      marshmallowRequiresPrediction({
        experiment: { stage: "instinct", requires_prediction: false },
      }),
    ).toBe(false);
  });

  it("marks experiment flip stage as requiring prediction", () => {
    expect(
      marshmallowRequiresPrediction({
        experiment: { stage: "flip", requires_prediction: true },
      }),
    ).toBe(true);
  });

  it("legacy marshmallows still require prediction", () => {
    expect(marshmallowRequiresPrediction({})).toBe(true);
  });
});
