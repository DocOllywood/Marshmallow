import { describe, expect, it } from "vitest";

import {
  CONTINUOUS_EXPERIMENT_CATALOG,
  isContinuousCatalogRound,
  isExcludedFromContinuousInventory,
  PRICE_QA_CONTINUOUS_ROUND_ID,
} from "@/domain/content/continuous-experiments";
import { LAUNCH_MONEY_DAILY_ROUND_ID } from "@/domain/content/launch-money-daily";
import { MONEY_WEEK_DAYS } from "@/domain/content/money-week";
import {
  continuousCurrentPlayMarshmallowId,
  isContinuousRoundComplete,
  isContinuousRoundPlayableNow,
  isContinuousInventoryAccessError,
  pickEligibleContinuousRoundId,
  resolveEntrySurface,
  type ContinuousRoundMarshmallow,
} from "@/domain/play/continuous";

function marshmallow(
  overrides: Partial<ContinuousRoundMarshmallow> & Pick<ContinuousRoundMarshmallow, "id" | "roundPosition">,
): ContinuousRoundMarshmallow {
  return {
    dailyRoundId: PRICE_QA_CONTINUOUS_ROUND_ID,
    status: "open",
    opensAt: "2026-08-01T12:00:00.000Z",
    closesAt: "2026-12-31T12:00:00.000Z",
    ...overrides,
  };
}

describe("continuous-experiments catalog", () => {
  it("allowlists Price QA only and excludes Day 1 and Money Week", () => {
    expect(isContinuousCatalogRound(PRICE_QA_CONTINUOUS_ROUND_ID)).toBe(true);
    expect(isExcludedFromContinuousInventory(LAUNCH_MONEY_DAILY_ROUND_ID)).toBe(true);
    for (const day of MONEY_WEEK_DAYS) {
      expect(isExcludedFromContinuousInventory(day.roundId)).toBe(true);
      expect(isContinuousCatalogRound(day.roundId)).toBe(false);
    }
    expect(CONTINUOUS_EXPERIMENT_CATALOG).toHaveLength(1);
  });
});

describe("continuous eligibility", () => {
  const roundMarshmallows = [
    marshmallow({ id: "q1", roundPosition: 1 }),
    marshmallow({ id: "q2", roundPosition: 2 }),
    marshmallow({ id: "q3", roundPosition: 3 }),
    marshmallow({ id: "q4", roundPosition: 4 }),
    marshmallow({ id: "q5", roundPosition: 5 }),
  ];

  it("requires five open marshmallows within the play window", () => {
    expect(isContinuousRoundPlayableNow(roundMarshmallows, Date.parse("2026-08-15T12:00:00.000Z"))).toBe(
      true,
    );
    expect(
      isContinuousRoundPlayableNow(
        roundMarshmallows.map((item) => ({ ...item, status: "closed" })),
      ),
    ).toBe(false);
  });

  it("excludes completed rounds and resumes in-progress play", () => {
    const sealed = new Set(["q1", "q2"]);
    expect(isContinuousRoundComplete(roundMarshmallows, sealed)).toBe(false);
    expect(continuousCurrentPlayMarshmallowId(roundMarshmallows, sealed)).toBe("q3");

    const complete = new Set(["q1", "q2", "q3", "q4", "q5"]);
    expect(isContinuousRoundComplete(roundMarshmallows, complete)).toBe(true);
    expect(
      pickEligibleContinuousRoundId({
        marshmallowsByRound: new Map([[PRICE_QA_CONTINUOUS_ROUND_ID, roundMarshmallows]]),
        userStates: new Map([
          [
            PRICE_QA_CONTINUOUS_ROUND_ID,
            {
              roundId: PRICE_QA_CONTINUOUS_ROUND_ID,
              sealedCount: 5,
              sealedMarshmallowIds: complete,
            },
          ],
        ]),
      }),
    ).toBeNull();
  });

  it("resolves entry_surface for continuous vs daily", () => {
    expect(
      resolveEntrySurface(PRICE_QA_CONTINUOUS_ROUND_ID, LAUNCH_MONEY_DAILY_ROUND_ID),
    ).toBe("continuous");
    expect(resolveEntrySurface(LAUNCH_MONEY_DAILY_ROUND_ID, LAUNCH_MONEY_DAILY_ROUND_ID)).toBe(
      "daily",
    );
  });

  it("recognizes expected continuous inventory access boundaries", () => {
    expect(isContinuousInventoryAccessError(new Error("permission denied for table entries"))).toBe(
      true,
    );
    expect(
      isContinuousInventoryAccessError(new Error("permission denied for table daily_rounds")),
    ).toBe(true);
    expect(
      isContinuousInventoryAccessError({ message: "permission denied for table entries" }),
    ).toBe(true);
    expect(isContinuousInventoryAccessError(new Error("home_payload_leaked_aggregates"))).toBe(
      false,
    );
  });
});
