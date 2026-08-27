import { describe, expect, it } from "vitest";

import {
  buildExperimentCrowdTrajectory,
  crowdSidePctFromResults,
  describeCrowdMovement,
} from "@/domain/daily/crowd-trajectory";

const tension = {
  id: "t1",
  slug: "justice-mercy",
  leftLabel: "JUSTICE",
  rightLabel: "MERCY",
  displayLabel: "JUSTICE vs. MERCY",
};

describe("experiment crowd trajectory", () => {
  it("builds stage crowd percentages on the reference side", () => {
    const trajectory = buildExperimentCrowdTrajectory({
      tension,
      stages: [
        { stage: "instinct", position: 1, leftPct: 68, rightPct: 32 },
        { stage: "pressure", position: 2, leftPct: 68, rightPct: 32 },
        { stage: "consequence", position: 3, leftPct: 47, rightPct: 53 },
        { stage: "flip", position: 4, leftPct: 72, rightPct: 28 },
      ],
    });

    expect(trajectory?.points).toHaveLength(4);
    expect(trajectory?.points[0]).toMatchObject({
      stageLabel: "INSTINCT",
      sideLabel: "JUSTICE",
      crowdPct: 68,
    });
    expect(trajectory?.crowdFirstMovementStage).toBe("consequence");
    expect(describeCrowdMovement(trajectory!)).toBeNull();
  });

  it("aggregates side percentages from result rows", () => {
    const pct = crowdSidePctFromResults({
      choices: [
        { id: "a", metadata: { tension_side: "left" } },
        { id: "b", metadata: { tension_side: "right" } },
      ],
      results: [
        { choice_id: "a", vote_pct: 62 },
        { choice_id: "b", vote_pct: 38 },
      ],
      side: "left",
    });
    expect(pct).toBe(62);
  });
});
