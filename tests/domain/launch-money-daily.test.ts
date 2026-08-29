import { describe, expect, it } from "vitest";

import { buildPriceTodaysRead } from "@/domain/daily/price-read";
import type { PriceTrajectory } from "@/domain/daily/price";
import { isDailyRoundVisibleOnHome, buildDailyRoundProgress } from "@/domain/daily/round";
import { marshmallowRequiresPrediction } from "@/domain/daily/experiment";
import { todaysMarshmallowInvitation } from "@/domain/daily/todays-marshmallow";
import {
  LAUNCH_MONEY_DAILY_DIRECT_QA_PATH,
  LAUNCH_MONEY_DAILY_LINE_CHOICES,
  LAUNCH_MONEY_DAILY_MARSHMALLOWS,
  LAUNCH_MONEY_DAILY_OUTSIDE_INVITATION,
  LAUNCH_MONEY_DAILY_PRICE_REFERENCE_SIDE,
  LAUNCH_MONEY_DAILY_PRINCIPLE_SLUG,
  LAUNCH_MONEY_DAILY_Q1,
  LAUNCH_MONEY_DAILY_ROUND_DATE,
  LAUNCH_MONEY_DAILY_ROUND_ID,
  LAUNCH_MONEY_DAILY_STAGE_SPEC,
  LAUNCH_MONEY_DAILY_TENSION_SLUG,
} from "@/domain/content/launch-money-daily";

describe("launch money daily editorial contract", () => {
  it("uses a non-conflicting draft QA date and round id", () => {
    expect(LAUNCH_MONEY_DAILY_ROUND_ID).toBe("40000000-0000-4000-8000-000000000009");
    expect(LAUNCH_MONEY_DAILY_ROUND_DATE).toBe("2026-10-27");
    expect(LAUNCH_MONEY_DAILY_ROUND_DATE).not.toBe("2026-10-13");
    expect(LAUNCH_MONEY_DAILY_ROUND_DATE).not.toBe("2026-10-20");
  });

  it("aligns partnership-vs-independence principle with belonging-independence tension", () => {
    expect(LAUNCH_MONEY_DAILY_PRINCIPLE_SLUG).toBe("partnership-vs-independence");
    expect(LAUNCH_MONEY_DAILY_TENSION_SLUG).toBe("belonging-independence");
    expect(LAUNCH_MONEY_DAILY_PRICE_REFERENCE_SIDE).toBe("left");
  });

  it("requires prediction only on flip", () => {
    for (const spec of LAUNCH_MONEY_DAILY_STAGE_SPEC) {
      const metadata = {
        experiment: {
          stage: spec.stage,
          requires_prediction: spec.requiresPrediction,
        },
      };
      expect(marshmallowRequiresPrediction(metadata)).toBe(spec.requiresPrediction);
    }
  });

  it("maps line choices to belonging/independence without neutral sides", () => {
    expect(LAUNCH_MONEY_DAILY_LINE_CHOICES).toHaveLength(5);
    expect(LAUNCH_MONEY_DAILY_LINE_CHOICES.map((c) => c.tensionSide)).toEqual([
      "right",
      "right",
      "left",
      "left",
      "left",
    ]);
    expect(LAUNCH_MONEY_DAILY_LINE_CHOICES.every((c) => c.tensionSide === "left" || c.tensionSide === "right")).toBe(
      true,
    );
  });

  it("exposes direct QA route at Q1 instinct", () => {
    expect(LAUNCH_MONEY_DAILY_DIRECT_QA_PATH).toBe(
      `/m/${LAUNCH_MONEY_DAILY_MARSHMALLOWS[0]}`,
    );
    expect(LAUNCH_MONEY_DAILY_Q1.move).toBeTruthy();
    expect(LAUNCH_MONEY_DAILY_Q1.stay).toBeTruthy();
  });

  it("hides all-draft rounds from home", () => {
    const progress = buildDailyRoundProgress({
      roundId: LAUNCH_MONEY_DAILY_ROUND_ID,
      title: "Would you move for their dream job?",
      subtitle: null,
      topicName: "Love",
      tension: null,
      roundDate: LAUNCH_MONEY_DAILY_ROUND_DATE,
      questions: LAUNCH_MONEY_DAILY_MARSHMALLOWS.map((id, index) => ({
        id,
        question: "Q",
        position: index + 1,
        sealed: false,
        openedReveal: false,
        status: "draft",
        revealsAt: "2026-10-27T22:00:00.000Z",
      })),
      openedRevealIds: new Set(),
      isExperimentDaily: true,
      experimentArchetype: "price",
    });

    expect(progress.currentPlayId).toBeNull();
    expect(isDailyRoundVisibleOnHome(progress)).toBe(false);
  });

  it("uses money-aware outside-the-experiment invitation", () => {
    const invitation = todaysMarshmallowInvitation(LAUNCH_MONEY_DAILY_TENSION_SLUG);
    expect(invitation).toBe(LAUNCH_MONEY_DAILY_OUTSIDE_INVITATION);
    expect(invitation).toMatch(/sacrifice/i);
    expect(invitation).not.toMatch(/greedy|selfish|loyal|materialistic/i);
  });
});

describe("launch money daily today's read tone", () => {
  function priceTrajectory(overrides: Partial<PriceTrajectory>): PriceTrajectory {
    return {
      startingSide: "left",
      finalSide: "left",
      startingChoiceLabel: "Move with them",
      endingChoiceLabel: "Move with them",
      firstMovementStage: null,
      firstMovementCostType: null,
      firstMovementCostLevel: null,
      firstMovementCostLabel: null,
      heldThroughout: true,
      movementCount: 0,
      returnedToOriginalPosition: false,
      lineChoice: "If we're building a long-term life together",
      stageCosts: [
        { stage: "instinct", position: 1, costType: null, costLevel: null, costLabel: "Before any offer details", side: "left" },
        { stage: "pressure", position: 2, costType: "TIME", costLevel: 1, costLabel: "Three months without work", side: "left" },
        { stage: "consequence", position: 3, costType: "CAREER", costLevel: 2, costLabel: "$68,000 salary", side: "left" },
        { stage: "flip", position: 4, costType: null, costLevel: null, costLabel: null, side: "left" },
      ],
      ...overrides,
    };
  }

  it("supports held throughout copy when a monetary stage exists", () => {
    const read = buildPriceTodaysRead(priceTrajectory({ heldThroughout: true }), null);
    expect(read.headline).toMatch(/HELD THROUGH EVERY PRICE/i);
    expect(read.bodyLines.join(" ")).not.toMatch(/greedy|selfish|loyal|materialistic/i);
  });

  it("supports held throughout copy without monetary stages", () => {
    const read = buildPriceTodaysRead(
      priceTrajectory({
        heldThroughout: true,
        stageCosts: [
          { stage: "instinct", position: 1, costType: null, costLevel: null, costLabel: "Before any offer details", side: "left" },
          { stage: "pressure", position: 2, costType: "TIME", costLevel: 1, costLabel: "Three months without work", side: "left" },
          { stage: "consequence", position: 3, costType: "TIME", costLevel: 2, costLabel: "Six months without work", side: "left" },
          { stage: "flip", position: 4, costType: null, costLevel: null, costLabel: null, side: "left" },
        ],
      }),
      null,
    );
    expect(read.headline).toBe("YOUR CALL HELD AS THE COST GOT HIGHER.");
  });

  it("supports movement at personal-cost pressure", () => {
    const read = buildPriceTodaysRead(
      priceTrajectory({
        heldThroughout: false,
        movementCount: 1,
        firstMovementStage: "pressure",
        firstMovementCostType: "TIME",
        firstMovementCostLabel: "Three months without work",
        finalSide: "right",
        endingChoiceLabel: "Stay where you are",
        stageCosts: [
          { stage: "instinct", position: 1, costType: null, costLevel: null, costLabel: "Before any offer details", side: "left" },
          { stage: "pressure", position: 2, costType: "TIME", costLevel: 1, costLabel: "Three months without work", side: "right" },
          { stage: "consequence", position: 3, costType: "CAREER", costLevel: 2, costLabel: "$68,000 salary", side: "right" },
          { stage: "flip", position: 4, costType: null, costLevel: null, costLabel: null, side: "right" },
        ],
      }),
      null,
    );
    expect(read.headline).toBe("THAT WAS YOUR TURNING POINT.");
  });

  it("supports movement at the price with hypothetical qualifier", () => {
    const read = buildPriceTodaysRead(
      priceTrajectory({
        heldThroughout: false,
        movementCount: 1,
        firstMovementStage: "consequence",
        firstMovementCostType: "CAREER",
        firstMovementCostLabel: "$68,000 salary",
        finalSide: "right",
        endingChoiceLabel: "Stay where you are",
        stageCosts: [
          { stage: "instinct", position: 1, costType: null, costLevel: null, costLabel: "Before any offer details", side: "left" },
          { stage: "pressure", position: 2, costType: "TIME", costLevel: 1, costLabel: "Three months without work", side: "left" },
          { stage: "consequence", position: 3, costType: "CAREER", costLevel: 2, costLabel: "$68,000 salary", side: "right" },
          { stage: "flip", position: 4, costType: null, costLevel: null, costLabel: null, side: "right" },
        ],
      }),
      null,
    );
    expect(read.headline).toMatch(/\$68,000 SALARY/);
    expect(read.bodyLines.join(" ")).toMatch(/hypothetical experiment/i);
  });
});
