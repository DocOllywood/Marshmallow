import { describe, expect, it } from "vitest";

import { buildExperimentTrajectory } from "@/domain/daily/trajectory";

describe("experiment trajectory", () => {
  const stages = (sides: Array<"left" | "right" | null>, line = "A week") =>
    [
      ...sides.map((side, index) => ({
        stage: (["instinct", "pressure", "consequence", "flip"] as const)[index]!,
        position: index + 1,
        choiceLabel: side ?? "Unknown",
        tensionSide: side,
        pressureType: index === 1 ? "mercy" : null,
        isLine: false,
      })),
      {
        stage: "line" as const,
        position: 5,
        choiceLabel: line,
        tensionSide: "neutral" as const,
        pressureType: null,
        isLine: true,
      },
    ];

  it("detects held throughout", () => {
    const trajectory = buildExperimentTrajectory(stages(["left", "left", "left", "left"]));
    expect(trajectory?.heldThroughout).toBe(true);
    expect(trajectory?.moved).toBe(false);
    expect(trajectory?.movementCount).toBe(0);
    expect(trajectory?.lineChoice).toBe("A week");
  });

  it("detects first movement at pressure", () => {
    const trajectory = buildExperimentTrajectory(stages(["left", "right", "right", "right"]));
    expect(trajectory?.firstMovementStage).toBe("pressure");
    expect(trajectory?.firstMovementPressureType).toBe("mercy");
    expect(trajectory?.movementCount).toBe(1);
  });

  it("detects first movement at consequence", () => {
    const trajectory = buildExperimentTrajectory(stages(["left", "left", "right", "right"]));
    expect(trajectory?.firstMovementStage).toBe("consequence");
    expect(trajectory?.movementCount).toBe(1);
  });

  it("detects first movement at flip", () => {
    const trajectory = buildExperimentTrajectory(stages(["left", "left", "left", "right"]));
    expect(trajectory?.firstMovementStage).toBe("flip");
    expect(trajectory?.movementCount).toBe(1);
  });

  it("detects multiple movements", () => {
    const trajectory = buildExperimentTrajectory(stages(["left", "right", "left", "left"]));
    expect(trajectory?.movementCount).toBe(2);
    expect(trajectory?.firstMovementStage).toBe("pressure");
  });

  it("detects return to original position", () => {
    const trajectory = buildExperimentTrajectory(stages(["left", "right", "left", "left"]));
    expect(trajectory?.returnedToOriginalPosition).toBe(true);
  });

  it("handles neutral and malformed sides safely", () => {
    const trajectory = buildExperimentTrajectory([
      {
        stage: "instinct",
        position: 1,
        choiceLabel: "Yes",
        tensionSide: "neutral",
        pressureType: null,
        isLine: false,
      },
      {
        stage: "pressure",
        position: 2,
        choiceLabel: "No",
        tensionSide: null,
        pressureType: null,
        isLine: false,
      },
      {
        stage: "flip",
        position: 4,
        choiceLabel: "Yes",
        tensionSide: "left",
        pressureType: null,
        isLine: false,
      },
    ]);
    expect(trajectory?.initialSide).toBe("left");
    expect(trajectory?.finalSide).toBe("left");
    expect(trajectory?.heldThroughout).toBe(true);
  });

  it("returns null when no binary choices exist", () => {
    expect(buildExperimentTrajectory([])).toBeNull();
  });
});
