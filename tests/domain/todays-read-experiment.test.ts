import { describe, expect, it } from "vitest";

import { buildTodaysRead } from "@/domain/daily/todays-read";

const experimentRoundMetadata = { experiment: { version: 1 } };

const tension = {
  id: "50000000-0000-4000-8000-000000000001",
  slug: "justice-mercy",
  leftLabel: "JUSTICE",
  rightLabel: "MERCY",
  displayLabel: "JUSTICE vs. MERCY",
};

describe("today's read experiment path", () => {
  it("uses trajectory copy for experiment dailies", () => {
    const read = buildTodaysRead(
      [
        { position: 1, question: "Q1", choiceLabel: "Yes", tensionSide: "left", hasSwitch: false, switchStayed: null, isLine: false, experimentStage: "instinct", pressureType: null },
        { position: 2, question: "Q2", choiceLabel: "No", tensionSide: "right", hasSwitch: false, switchStayed: null, isLine: false, experimentStage: "pressure", pressureType: "mercy" },
        { position: 3, question: "Q3", choiceLabel: "No", tensionSide: "right", hasSwitch: false, switchStayed: null, isLine: false, experimentStage: "consequence", pressureType: null },
        { position: 4, question: "Q4", choiceLabel: "No", tensionSide: "right", hasSwitch: false, switchStayed: null, isLine: false, experimentStage: "flip", pressureType: null },
        { position: 5, question: "Line?", choiceLabel: "5 minutes", tensionSide: "neutral", hasSwitch: false, switchStayed: null, isLine: true, experimentStage: "line", pressureType: null },
      ],
      tension,
      null,
      experimentRoundMetadata,
    );

    expect(read?.isExperiment).toBe(true);
    expect(read?.headline).toBe("YOU MOVED WHEN MERCY ENTERED THE PICTURE.");
    expect(read?.lineCopy).toBe("5 minutes");
  });

  it("keeps legacy today's read unchanged without experiment metadata", () => {
    const read = buildTodaysRead(
      [
        { position: 1, question: "Q1", choiceLabel: "Yes", tensionSide: "left", hasSwitch: false, switchStayed: null, isLine: false },
        { position: 4, question: "Q4", choiceLabel: "Yes", tensionSide: "left", hasSwitch: true, switchStayed: false, isLine: false },
      ],
      tension,
      null,
    );

    expect(read?.isLegacy).toBe(false);
    expect(read?.isExperiment).toBeUndefined();
    expect(read?.headline).toBe("You chose justice — until the cost changed your call.");
  });
});
