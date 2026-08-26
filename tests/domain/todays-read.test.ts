import { describe, expect, it } from "vitest";

import { buildTodaysRead, formatLineReadCopy } from "@/domain/daily/todays-read";

const tension = {
  id: "50000000-0000-4000-8000-000000000001",
  slug: "honesty-kindness",
  leftLabel: "HONESTY",
  rightLabel: "KINDNESS",
  displayLabel: "HONESTY vs. KINDNESS",
};

const tomorrow = {
  id: "50000000-0000-4000-8000-000000000002",
  slug: "loyalty-self-preservation",
  leftLabel: "LOYALTY",
  rightLabel: "SELF-PRESERVATION",
  displayLabel: "LOYALTY vs. SELF-PRESERVATION",
};

describe("today's read narrative", () => {
  it("formats line copy from the question tail", () => {
    expect(
      formatLineReadCopy(
        "How long could your closest friend hide a major secret before you'd consider it a betrayal?",
        "A month",
      ),
    ).toBe("A month before you'd consider it a betrayal.");
  });

  it("narrates mostly-left tension choices", () => {
    const read = buildTodaysRead(
      [
        { position: 1, question: "Q1", choiceLabel: "Yes", tensionSide: "left", hasSwitch: false, switchStayed: null, isLine: false },
        { position: 2, question: "Q2", choiceLabel: "Yes", tensionSide: "left", hasSwitch: false, switchStayed: null, isLine: false },
        { position: 3, question: "Q3", choiceLabel: "No", tensionSide: "right", hasSwitch: false, switchStayed: null, isLine: false },
        { position: 4, question: "Q4", choiceLabel: "Yes", tensionSide: "left", hasSwitch: true, switchStayed: true, isLine: false },
        { position: 5, question: "When does withholding become lying?", choiceLabel: "After a month", tensionSide: "neutral", hasSwitch: false, switchStayed: null, isLine: true },
      ],
      tension,
      tomorrow,
    );

    expect(read?.headline).toBe("You leaned toward honesty — and held when the stakes changed.");
    expect(read?.bodyLines[0]).toBe("You chose honesty in 3 of today's dilemmas.");
    expect(read?.lineCopy).toBe("After a month");
    expect(read?.tomorrowTease).toBe("LOYALTY vs. SELF-PRESERVATION");
    expect(read?.isLegacy).toBe(false);
  });

  it("narrates mostly-right tension choices", () => {
    const read = buildTodaysRead(
      [
        { position: 1, question: "Q1", choiceLabel: "No", tensionSide: "right", hasSwitch: false, switchStayed: null, isLine: false },
        { position: 2, question: "Q2", choiceLabel: "No", tensionSide: "right", hasSwitch: false, switchStayed: null, isLine: false },
        { position: 3, question: "Q3", choiceLabel: "Yes", tensionSide: "left", hasSwitch: false, switchStayed: null, isLine: false },
      ],
      tension,
      null,
    );

    expect(read?.headline).toBe("You leaned toward kindness today.");
    expect(read?.bodyLines[0]).toBe("You chose kindness in 2 of today's dilemmas.");
  });

  it("narrates switch stay", () => {
    const read = buildTodaysRead(
      [
        { position: 4, question: "Q4", choiceLabel: "Yes", tensionSide: "left", hasSwitch: true, switchStayed: true, isLine: false },
      ],
      tension,
      null,
    );

    expect(read?.headline).toBe("You leaned toward honesty — and held when the stakes changed.");
    expect(read?.bodyLines[0]).toBe("You chose honesty in 1 of today's dilemmas.");
    expect(read?.switchCopy).toBe("You held your position when the circumstances changed.");
  });

  it("narrates switch change", () => {
    const read = buildTodaysRead(
      [
        { position: 1, question: "Q1", choiceLabel: "Yes", tensionSide: "left", hasSwitch: false, switchStayed: null, isLine: false },
        { position: 2, question: "Q2", choiceLabel: "Yes", tensionSide: "left", hasSwitch: false, switchStayed: null, isLine: false },
        { position: 4, question: "Q4", choiceLabel: "Yes", tensionSide: "left", hasSwitch: true, switchStayed: false, isLine: false },
      ],
      tension,
      null,
    );

    expect(read?.headline).toBe("You leaned toward honesty — until honesty became destructive.");
    expect(read?.bodyLines.at(-1)).toBe("But when the consequence changed, you changed your call.");
  });

  it("narrates line threshold copy", () => {
    const read = buildTodaysRead(
      [
        {
          position: 5,
          question: "When does withholding information become lying?",
          choiceLabel: "After a month",
          tensionSide: "neutral",
          hasSwitch: false,
          switchStayed: null,
          isLine: true,
        },
      ],
      tension,
      null,
    );

    expect(read?.lineCopy).toBe("After a month");
  });

  it("falls back gracefully without tension metadata", () => {
    const read = buildTodaysRead(
      [
        { position: 1, question: "Q1", choiceLabel: "Yes", tensionSide: null, hasSwitch: false, switchStayed: null, isLine: false },
        { position: 4, question: "Q4", choiceLabel: "Yes", tensionSide: null, hasSwitch: true, switchStayed: false, isLine: false },
      ],
      null,
      tomorrow,
    );

    expect(read?.isLegacy).toBe(true);
    expect(read?.headline).toBe("You shifted when the circumstances changed.");
    expect(read?.tomorrowTease).toBe("LOYALTY vs. SELF-PRESERVATION");
  });

  it("omits tomorrow tease when no next daily exists", () => {
    const read = buildTodaysRead(
      [{ position: 1, question: "Q1", choiceLabel: "Yes", tensionSide: "left", hasSwitch: false, switchStayed: null, isLine: false }],
      tension,
      null,
    );

    expect(read?.tomorrowTease).toBeNull();
  });
});
