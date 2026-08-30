import { describe, expect, it } from "vitest";

import { THE_BEST_CHOICE_IDS } from "@/domain/content/the-best-experiment";
import {
  initialTheBestYouSureRehearsalState,
  THE_BEST_YOU_SURE_REHEARSAL_STORAGE_KEY,
  youSureQ1Reaction,
  youSureQ2Reaction,
  youSureQ3Reaction,
  youSureQ4Reaction,
  buildYouSureTodaysRead,
} from "@/domain/dev/the-best-you-sure-rehearsal-fixture";

describe("the-best you sure rehearsal fixture", () => {
  it("uses isolated session storage key", () => {
    expect(THE_BEST_YOU_SURE_REHEARSAL_STORAGE_KEY).toBe(
      "marshmallow-the-best-you-sure-rehearsal",
    );
    expect(initialTheBestYouSureRehearsalState().phase).toBe("intro");
  });

  it("matches shared today's read for same choices", () => {
    const state = {
      ...initialTheBestYouSureRehearsalState(),
      choices: {
        1: THE_BEST_CHOICE_IDS.q1Yes,
        2: THE_BEST_CHOICE_IDS.q2StillYes,
        3: THE_BEST_CHOICE_IDS.q3Refuse,
        4: THE_BEST_CHOICE_IDS.q4Yes,
      },
      lineChoiceId: THE_BEST_CHOICE_IDS.lineWho,
    };
    const read = buildYouSureTodaysRead(state);
    expect(read.headline).toBe("YOU WOULDN'T GIVE THE NAME.");
  });

  it("provides dedicated switch-sides phase in flow order", () => {
    const phases = [
      "intro",
      "q1-play",
      "q1-react",
      "q2-play",
      "q2-react",
      "q3-play",
      "q3-react",
      "switch-sides",
      "q4-play",
      "q4-react",
      "q4-predict",
      "line-play",
      "line-locked",
      "todays-read",
      "outside",
      "complete",
    ] as const;
    expect(phases).toContain("switch-sides");
  });

  it("uses Q4 inverse-side reaction copy", () => {
    const reaction = youSureQ4Reaction({
      1: THE_BEST_CHOICE_IDS.q1Yes,
      2: THE_BEST_CHOICE_IDS.q2StillYes,
      3: THE_BEST_CHOICE_IDS.q3Refuse,
      4: THE_BEST_CHOICE_IDS.q4Yes,
    });
    expect(reaction?.headline).toBe("DIFFERENT FROM THIS SIDE.");
  });

  it("uses conversational Q1–Q3 reactions", () => {
    expect(youSureQ1Reaction(THE_BEST_CHOICE_IDS.q1No).headline).toBe("YOU SAID NO.");
    expect(youSureQ2Reaction({ 1: THE_BEST_CHOICE_IDS.q1Yes, 2: THE_BEST_CHOICE_IDS.q2No }).headline).toBe(
      "THAT MOVED YOU.",
    );
    expect(
      youSureQ3Reaction({
        1: THE_BEST_CHOICE_IDS.q1Yes,
        2: THE_BEST_CHOICE_IDS.q2StillYes,
        3: THE_BEST_CHOICE_IDS.q3Refuse,
      }).headline,
    ).toBe("STILL NO.");
  });
});
