import { describe, expect, it } from "vitest";

import {
  MONEY_WEEK_BINARY_CHOICES,
  MONEY_WEEK_BINARY_SIDES,
  MONEY_WEEK_DAYS,
  MONEY_WEEK_Q1_LEFT_CHOICE_INDEX,
  MONEY_WEEK_SEMANTIC_SIDES,
} from "@/domain/content/money-week";
import { buildPriceTrajectory } from "@/domain/daily/price";
import { buildPriceTodaysRead } from "@/domain/daily/price-read";
import { buildExperimentTrajectory } from "@/domain/daily/trajectory";
import type { TrajectoryInputStage } from "@/domain/daily/trajectory";

function simulateTrajectory(
  day: number,
  sideByStage: readonly ("left" | "right")[],
): ReturnType<typeof buildPriceTrajectory> | null {
  const spec = MONEY_WEEK_DAYS.find((item) => item.day === day);
  if (!spec) return null;
  const choices = MONEY_WEEK_BINARY_CHOICES[day];
  if (!choices) return null;
  const stageSpecs = spec.stages.filter((s) => s.stage !== "line");

  const stages: TrajectoryInputStage[] = stageSpecs.map((stageSpec, index) => ({
    stage: stageSpec.stage as TrajectoryInputStage["stage"],
    position: stageSpec.position,
    choiceLabel:
      sideByStage[index] === "left" ? choices[index * 2]! : choices[index * 2 + 1]!,
    tensionSide: sideByStage[index]!,
    pressureType: stageSpec.pressureType,
    costType: stageSpec.costType,
    costLevel: stageSpec.costLevel,
    costLabel: stageSpec.costLabel,
    isLine: false,
  }));

  const trajectory = buildExperimentTrajectory(stages);
  if (!trajectory) return null;
  return buildPriceTrajectory(trajectory, stages);
}

describe("money week semantic sides", () => {
  for (const day of [2, 3, 4, 5, 6, 7] as const) {
    it(`day ${day} maps Q1 first choice to the left pole`, () => {
      const sides = MONEY_WEEK_BINARY_SIDES[day]!;
      expect(sides[MONEY_WEEK_Q1_LEFT_CHOICE_INDEX]).toBe("left");
    });

    it(`day ${day} keeps binary sides aligned through Q3`, () => {
      const sides = MONEY_WEEK_BINARY_SIDES[day]!;
      expect(sides.slice(0, 6)).toEqual([
        "left",
        "right",
        "left",
        "right",
        "left",
        "right",
      ]);
    });
  }

  it("price_reference_side matches the pole we measure crowd retention of", () => {
    for (const daySpec of MONEY_WEEK_DAYS) {
      const semantic = MONEY_WEEK_SEMANTIC_SIDES[daySpec.day]!;
      expect(semantic.priceReferenceMeasures.length).toBeGreaterThan(10);
      if (daySpec.priceReferenceSide === "left") {
        expect(semantic.priceReferenceMeasures).toMatch(/cover|declin|giv/i);
      } else {
        expect(semantic.priceReferenceMeasures).toMatch(/keep|declin|private|refus/i);
      }
    }
  });

  it("day 6 flip maps respect-for-decliner to authenticity (right)", () => {
    const sides = MONEY_WEEK_BINARY_SIDES[6]!;
    const choices = MONEY_WEEK_BINARY_CHOICES[6]!;
    expect(choices[6]!).toBe("Yes");
    expect(sides[6]!).toBe("right");
    expect(choices[7]!).toBe("No");
    expect(sides[7]!).toBe("left");
  });

  it("day 7 flip maps understanding refusal to forgiveness (left)", () => {
    const sides = MONEY_WEEK_BINARY_SIDES[7]!;
    expect(sides[6]!).toBe("left");
    expect(sides[7]!).toBe("right");
  });

  it("line choices never use neutral sides", () => {
    for (const day of MONEY_WEEK_DAYS) {
      expect(day.lineChoices.every((c) => c.tensionSide !== "neutral")).toBe(true);
    }
  });
});

describe("money week trajectory reads", () => {
  it("day 6 left-throughout with old flip mapping would have falsely read as held", () => {
    const statusTakerRespectsDecliner = simulateTrajectory(6, ["left", "left", "left", "right"]);
    expect(statusTakerRespectsDecliner?.heldThroughout).toBe(false);
    expect(statusTakerRespectsDecliner?.firstMovementStage).toBe("flip");
  });

  it("day 6 authenticity holder reads held throughout", () => {
    const price = simulateTrajectory(6, ["right", "right", "right", "right"]);
    expect(price?.heldThroughout).toBe(true);
    const read = buildPriceTodaysRead(price!, null);
    expect(read.headline).toMatch(/HELD/i);
  });

  it("day 3 left-to-right at price produces movement read", () => {
    const price = simulateTrajectory(3, ["left", "left", "right", "left"]);
    expect(price?.firstMovementStage).toBe("consequence");
    const read = buildPriceTodaysRead(price!, null);
    expect(read.headline).toMatch(/TURNING POINT|MOVED|26 WEEKENDS/i);
  });
});
