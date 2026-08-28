import { describe, expect, it } from "vitest";

import {
  EXPERIMENT_VERSION,
  isExperimentDailyRound,
  isPriceExperiment,
  marshmallowRequiresPrediction,
  parseDailyRoundExperimentMetadata,
  parseExperimentArchetype,
  parseMarshmallowExperimentMetadata,
  resolveMarshmallowExperimentMetadata,
} from "@/domain/daily/experiment";

describe("experiment detection", () => {
  it("detects experiment daily rounds by version metadata", () => {
    expect(
      isExperimentDailyRound({ experiment: { version: EXPERIMENT_VERSION } }),
    ).toBe(true);
    expect(isExperimentDailyRound({})).toBe(false);
    expect(isExperimentDailyRound(null)).toBe(false);
  });

  it("parses explicit marshmallow experiment metadata", () => {
    const parsed = parseMarshmallowExperimentMetadata(
      {
        experiment: {
          stage: "pressure",
          pressure_type: "mercy",
          requires_prediction: false,
        },
      },
      2,
      false,
    );
    expect(parsed).toEqual({
      stage: "pressure",
      pressureType: "mercy",
      requiresPrediction: false,
      costType: null,
      costLevel: null,
      costLabel: null,
    });
  });

  it("defaults requires_prediction to true for legacy marshmallows", () => {
    expect(marshmallowRequiresPrediction({})).toBe(true);
    expect(marshmallowRequiresPrediction(null)).toBe(true);
  });

  it("respects explicit requires_prediction false", () => {
    expect(
      marshmallowRequiresPrediction({
        experiment: { requires_prediction: false },
      }),
    ).toBe(false);
  });

  it("infers experiment stage metadata from round position when round is experiment", () => {
    const resolved = resolveMarshmallowExperimentMetadata({
      metadata: {},
      roundMetadata: { experiment: { version: 1 } },
      roundPosition: 3,
      isLine: false,
    });
    expect(resolved).toEqual({
      stage: "consequence",
      pressureType: null,
      requiresPrediction: false,
      costType: null,
      costLevel: null,
      costLabel: null,
    });
  });

  it("returns null for non-experiment rounds", () => {
    expect(
      resolveMarshmallowExperimentMetadata({
        metadata: { experiment: { stage: "flip", requires_prediction: true } },
        roundMetadata: {},
        roundPosition: 4,
        isLine: false,
      }),
    ).toBeNull();
  });

  it("parses daily round metadata", () => {
    expect(parseDailyRoundExperimentMetadata({ experiment: { version: 1 } })).toEqual({
      version: 1,
      archetype: "default",
      priceReferenceSide: null,
    });
  });

  it("detects price archetype metadata", () => {
    expect(parseExperimentArchetype({ experiment: { version: 1, archetype: "price" } })).toBe(
      "price",
    );
    expect(isPriceExperiment({ experiment: { version: 1, archetype: "price" } })).toBe(true);
  });
});
