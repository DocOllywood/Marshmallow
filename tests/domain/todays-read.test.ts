import { describe, expect, it } from "vitest";

import { buildTodaysRead, formatLineReadCopy } from "@/domain/daily/todays-read";

describe("today's read", () => {
  it("formats line copy from the question tail", () => {
    expect(
      formatLineReadCopy(
        "How long could your closest friend hide a major secret before you'd consider it a betrayal?",
        "A month",
      ),
    ).toBe("A month before you'd consider it a betrayal.");
  });

  it("summarizes held ground after a switch stay", () => {
    const read = buildTodaysRead([
      { position: 1, question: "Q1", choiceLabel: "Yes", hasSwitch: false, switchStayed: null, isLine: false },
      { position: 2, question: "Q2", choiceLabel: "No", hasSwitch: false, switchStayed: null, isLine: false },
      { position: 3, question: "Q3", choiceLabel: "Yes", hasSwitch: false, switchStayed: null, isLine: false },
      {
        position: 4,
        question: "Could you forgive cheating?",
        choiceLabel: "Yes",
        hasSwitch: true,
        switchStayed: true,
        isLine: false,
      },
      {
        position: 5,
        question: "How long could your closest friend hide a major secret before you'd consider it a betrayal?",
        choiceLabel: "A month",
        hasSwitch: false,
        switchStayed: null,
        isLine: true,
      },
    ]);

    expect(read?.headline).toBe("You held your ground when the circumstances changed.");
    expect(read?.lineCopy).toBe("A month before you'd consider it a betrayal.");
    expect(read?.heldCount).toBe(5);
    expect(read?.shiftedCount).toBe(0);
  });

  it("summarizes a switch shift", () => {
    const read = buildTodaysRead([
      { position: 1, question: "Q1", choiceLabel: "Yes", hasSwitch: false, switchStayed: null, isLine: false },
      { position: 2, question: "Q2", choiceLabel: "No", hasSwitch: false, switchStayed: null, isLine: false },
      { position: 3, question: "Q3", choiceLabel: "Yes", hasSwitch: false, switchStayed: null, isLine: false },
      {
        position: 4,
        question: "Could you forgive cheating?",
        choiceLabel: "Yes",
        hasSwitch: true,
        switchStayed: false,
        isLine: false,
      },
      {
        position: 5,
        question: "How long before betrayal?",
        choiceLabel: "Never",
        hasSwitch: false,
        switchStayed: null,
        isLine: true,
      },
    ]);

    expect(read?.headline).toBe("You shifted when the circumstances changed.");
    expect(read?.heldCount).toBe(4);
    expect(read?.shiftedCount).toBe(1);
  });
});
