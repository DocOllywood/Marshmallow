import { describe, expect, it } from "vitest";

import { buildExperimentTodaysRead } from "@/domain/daily/experiment-read";
import { buildUserPathPoints } from "@/domain/daily/experiment-play";
import { buildExperimentTrajectory } from "@/domain/daily/trajectory";
import type { HumanTension } from "@/domain/daily/tension";

function trajectoryFromSides(sides: Array<"left" | "right">, pressureType: string | null = null) {
  return buildExperimentTrajectory([
    ...sides.map((side, index) => ({
      stage: (["instinct", "pressure", "consequence", "flip"] as const)[index]!,
      position: index + 1,
      choiceLabel: side,
      tensionSide: side,
      pressureType: index === 1 ? pressureType : null,
      isLine: false,
    })),
    {
      stage: "line",
      position: 5,
      choiceLabel: "5 minutes",
      tensionSide: "neutral" as const,
      pressureType: null,
      isLine: true,
    },
  ])!;
}

describe("experiment today's read", () => {
  it("describes never moved", () => {
    const read = buildExperimentTodaysRead(trajectoryFromSides(["right", "right", "right", "right"]), null);
    expect(read.headline).toBe("YOU NEVER MOVED.");
    expect(read.bodyLines).toContain("Remorse didn't move you.");
    expect(read.bodyLines).toContain("Your answer stayed on the same side throughout.");
    expect(read.lineCopy).toBe("5 minutes");
    expect(read.isExperiment).toBe(true);
  });

  it("describes first movement at pressure", () => {
    const read = buildExperimentTodaysRead(
      trajectoryFromSides(["left", "right", "right", "right"], "mercy"),
      null,
    );
    expect(read.headline).toBe("YOU MOVED WHEN MERCY ENTERED THE PICTURE.");
  });

  it("describes first movement at consequence", () => {
    const read = buildExperimentTodaysRead(
      trajectoryFromSides(["right", "right", "left", "left"]),
      null,
    );
    expect(read.headline).toBe("YOU HELD UNTIL OTHER PEOPLE HAD TO PAY THE PRICE.");
    expect(read.bodyLines).toContain("The first thing that changed your call was collateral harm.");
  });

  it("describes flip-only movement", () => {
    const read = buildExperimentTodaysRead(
      trajectoryFromSides(["right", "right", "right", "left"]),
      null,
    );
    expect(read.headline).toBe("YOUR RULE HELD UNTIL YOU WERE ON THE OTHER SIDE OF IT.");
    expect(read.bodyLines).toContain("Changing perspective was the first thing that moved your call.");
  });

  it("describes returned to original after remorse", () => {
    const read = buildExperimentTodaysRead(
      trajectoryFromSides(["right", "left", "right", "right"], "REMORSE"),
      null,
    );
    expect(read.headline).toBe("YOU CHANGED YOUR MIND. THEN CHANGED IT BACK.");
    expect(read.bodyLines).toContain("Remorse moved you first.");
    expect(read.bodyLines).toContain("Later circumstances pulled you back toward where you began.");
  });

  it("describes multiple movements", () => {
    const read = buildExperimentTodaysRead(
      trajectoryFromSides(["left", "right", "left", "right"]),
      null,
    );
    expect(read.headline).toBe("YOUR ANSWER MOVED MORE THAN ONCE.");
  });

  it("does not use personality language", () => {
    const read = buildExperimentTodaysRead(
      trajectoryFromSides(["left", "right", "right", "right"], "mercy"),
      null,
    );
    const combined = [read.headline, ...read.bodyLines].join(" ");
    expect(combined).not.toMatch(/you are|you value|selfish|moral|personality/i);
  });
});

const loyaltyJustice: HumanTension = {
  id: "50000000-0000-4000-8000-000000000011",
  slug: "loyalty-justice",
  leftLabel: "LOYALTY",
  rightLabel: "JUSTICE",
  displayLabel: "LOYALTY vs. JUSTICE",
};

describe("loyalty vs justice editorial paths", () => {
  it("path A — never moved on justice", () => {
    const read = buildExperimentTodaysRead(trajectoryFromSides(["right", "right", "right", "right"]), null);
    expect(read.headline).toBe("YOU NEVER MOVED.");
  });

  it("path B — held until collateral harm", () => {
    const read = buildExperimentTodaysRead(trajectoryFromSides(["right", "right", "left", "left"]), null);
    expect(read.headline).toBe("YOU HELD UNTIL OTHER PEOPLE HAD TO PAY THE PRICE.");
  });

  it("path C — flip moved first", () => {
    const read = buildExperimentTodaysRead(trajectoryFromSides(["right", "right", "right", "left"]), null);
    expect(read.headline).toBe("YOUR RULE HELD UNTIL YOU WERE ON THE OTHER SIDE OF IT.");
  });

  it("path D — remorse then back", () => {
    const read = buildExperimentTodaysRead(
      trajectoryFromSides(["right", "left", "right", "right"], "REMORSE"),
      null,
    );
    expect(read.headline).toBe("YOU CHANGED YOUR MIND. THEN CHANGED IT BACK.");
  });

  it("path E — multiple movements", () => {
    const read = buildExperimentTodaysRead(trajectoryFromSides(["right", "left", "right", "left"]), null);
    expect(read.headline).toBe("YOUR ANSWER MOVED MORE THAN ONCE.");
  });

  it("annotates moved back toward initial justice side", () => {
    const trajectory = buildExperimentTrajectory([
      { stage: "instinct", position: 1, choiceLabel: "Tell them", tensionSide: "right", pressureType: null, isLine: false },
      { stage: "pressure", position: 2, choiceLabel: "Tell them", tensionSide: "right", pressureType: "REMORSE", isLine: false },
      { stage: "consequence", position: 3, choiceLabel: "Stay silent", tensionSide: "left", pressureType: "HARM_TO_OTHERS", isLine: false },
      { stage: "flip", position: 4, choiceLabel: "Yes", tensionSide: "right", pressureType: "PERSPECTIVE", isLine: false },
      { stage: "line", position: 5, choiceLabel: "If it happens again", tensionSide: "neutral", pressureType: null, isLine: true },
    ])!;
    const path = buildUserPathPoints(trajectory, loyaltyJustice);
    expect(path.find((point) => point.stage === "consequence")?.annotation).toBe("← YOU MOVED");
    expect(path.find((point) => point.stage === "flip")?.annotation).toBe("← YOU MOVED BACK");
  });
});
