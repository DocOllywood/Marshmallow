import { describe, expect, it } from "vitest";

import { alternateChoice, needsSwitchStep } from "@/domain/play/switch";

describe("the switch domain", () => {
  const choices = [
    { id: "yes", label: "Yes", sort_order: 0 },
    { id: "no", label: "No", sort_order: 1 },
  ];

  it("finds the alternate binary choice", () => {
    expect(alternateChoice(choices, "yes")?.label).toBe("No");
    expect(alternateChoice(choices, "no")?.label).toBe("Yes");
  });

  it("requires a switch step only after pick and before response", () => {
    expect(
      needsSwitchStep({
        switchPrompt: "What if they only admitted it after being caught?",
        ownChoiceId: "yes",
        switchStayed: null,
      }),
    ).toBe(true);

    expect(
      needsSwitchStep({
        switchPrompt: "What if they only admitted it after being caught?",
        ownChoiceId: "yes",
        switchStayed: false,
      }),
    ).toBe(false);

    expect(
      needsSwitchStep({
        switchPrompt: null,
        ownChoiceId: "yes",
        switchStayed: null,
      }),
    ).toBe(false);
  });
});
