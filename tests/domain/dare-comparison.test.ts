import { describe, expect, it } from "vitest";

import { buildDareComparisonView } from "@/domain/dare/comparison";
import type { DareStageChoice } from "@/domain/dare/types";

const baseChoices = (
  viewer: Partial<Record<number, string>>,
  other: Partial<Record<number, string>>,
): { viewer: DareStageChoice[]; other: DareStageChoice[] } => {
  const stages = [
    { position: 1, stage: "instinct" },
    { position: 2, stage: "pressure" },
    { position: 3, stage: "consequence" },
    { position: 4, stage: "flip" },
    { position: 5, stage: "line", isLine: true },
  ];

  const build = (
    map: Partial<Record<number, string>>,
    sides: Partial<Record<number, "left" | "right">>,
  ) =>
    stages.map((row) => ({
      position: row.position,
      stage: row.stage,
      choice_label: map[row.position] ?? "Choice",
      is_line: Boolean(row.isLine),
      tension_side: row.isLine ? null : (sides[row.position] ?? "left"),
      predicted_pct: null,
    }));

  return {
    viewer: build(viewer, { 1: "left", 2: "right", 3: "right", 4: "left" }),
    other: build(other, { 1: "right", 2: "right", 3: "right", 4: "right" }),
  };
};

describe("buildDareComparisonView", () => {
  it("summarizes agreement count across stages", () => {
    const { viewer, other } = baseChoices(
      { 1: "Move", 2: "Move", 3: "Stay", 4: "Stay", 5: "Line A" },
      { 1: "Move", 2: "Stay", 3: "Stay", 4: "Go", 5: "Line B" },
    );

    const view = buildDareComparisonView({
      viewerChoices: viewer,
      otherChoices: other,
      viewerLabel: "You",
      otherLabel: "Richie",
    });

    expect(view.headline).toBe("YOU vs RICHIE");
    expect(view.agreementCount).toBe(2);
    expect(view.summary).toBe("YOU DREW DIFFERENT LINES.");
    expect(view.stages).toHaveLength(4);
  });

  it("describes movement divergence observationally", () => {
    const { viewer, other } = baseChoices(
      { 1: "Move", 2: "Move", 3: "Move", 4: "Move", 5: "A" },
      { 1: "Stay", 2: "Stay", 3: "Stay", 4: "Stay", 5: "B" },
    );

    const view = buildDareComparisonView({
      viewerChoices: viewer,
      otherChoices: other,
      viewerLabel: "You",
      otherLabel: "Sam",
    });

    expect(view.movementCopy).toMatch(/YOU MOVED/i);
    expect(view.movementCopy).toMatch(/SAM NEVER MOVED/i);
  });
});

describe("experimentDaresEnabled", () => {
  it("defaults to disabled unless env flag is true", async () => {
    const original = process.env.NEXT_PUBLIC_EXPERIMENT_DARES_ENABLED;
    delete process.env.NEXT_PUBLIC_EXPERIMENT_DARES_ENABLED;
    const { experimentDaresEnabled } = await import("@/lib/env/experiment-dares");
    expect(experimentDaresEnabled()).toBe(false);
    process.env.NEXT_PUBLIC_EXPERIMENT_DARES_ENABLED = original;
  });
});
