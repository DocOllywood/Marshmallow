import { describe, expect, it } from "vitest";

import {
  buildTheBestTodaysRead,
  THE_BEST_CHOICE_IDS,
  THE_BEST_STAGES,
  theBestChoiceSide,
} from "@/domain/content/the-best-experiment";
import {
  initialTheBestRehearsalState,
  THE_BEST_REHEARSAL_STORAGE_KEY,
} from "@/domain/dev/the-best-rehearsal-fixture";
import {
  initialTheBestYouSureRehearsalState,
  THE_BEST_YOU_SURE_REHEARSAL_STORAGE_KEY,
  youSureQ1Reaction,
  youSureQ2Reaction,
  youSureQ3Reaction,
  youSureQ4Reaction,
} from "@/domain/dev/the-best-you-sure-rehearsal-fixture";

describe("the-best semantic mapping", () => {
  it("maps Q1–Q4 binary sides from canonical behavior, not button order", () => {
    const q1 = THE_BEST_STAGES[0]!;
    expect(theBestChoiceSide(q1, THE_BEST_CHOICE_IDS.q1Yes)).toBe("left");
    expect(theBestChoiceSide(q1, THE_BEST_CHOICE_IDS.q1No)).toBe("right");

    const q4 = THE_BEST_STAGES[3]!;
    expect(theBestChoiceSide(q4, THE_BEST_CHOICE_IDS.q4No)).toBe("left");
    expect(theBestChoiceSide(q4, THE_BEST_CHOICE_IDS.q4Yes)).toBe("right");
  });

  it("maps line choices to truth threshold sides", () => {
    const line = THE_BEST_STAGES[4]!;
    expect(theBestChoiceSide(line, THE_BEST_CHOICE_IDS.lineDontKnow)).toBe("left");
    expect(theBestChoiceSide(line, THE_BEST_CHOICE_IDS.lineEx)).toBe("neutral");
    expect(theBestChoiceSide(line, THE_BEST_CHOICE_IDS.lineWhyBetter)).toBe("right");
  });

  it("holds across semantically equivalent answers at Q2", () => {
    const read = buildTheBestTodaysRead({
      choices: {
        1: THE_BEST_CHOICE_IDS.q1Yes,
        2: THE_BEST_CHOICE_IDS.q2StillYes,
        3: THE_BEST_CHOICE_IDS.q3Refuse,
        4: THE_BEST_CHOICE_IDS.q4No,
      },
      lineChoiceId: THE_BEST_CHOICE_IDS.lineDontKnow,
    });
    expect(read.headline).toBe("YOU KEPT THE EASIER ANSWER.");
  });

  it("detects move at Q2", () => {
    const read = buildTheBestTodaysRead({
      choices: {
        1: THE_BEST_CHOICE_IDS.q1Yes,
        2: THE_BEST_CHOICE_IDS.q2No,
        3: THE_BEST_CHOICE_IDS.q3Name,
        4: THE_BEST_CHOICE_IDS.q4Yes,
      },
      lineChoiceId: THE_BEST_CHOICE_IDS.lineDontKnow,
    });
    expect(read.headline).toBe(`"DON'T LIE TO ME" MOVED YOU.`);
  });

  it("detects Q3 withhold + Q4 disclose inverse pattern", () => {
    const read = buildTheBestTodaysRead({
      choices: {
        1: THE_BEST_CHOICE_IDS.q1Yes,
        2: THE_BEST_CHOICE_IDS.q2StillYes,
        3: THE_BEST_CHOICE_IDS.q3Refuse,
        4: THE_BEST_CHOICE_IDS.q4Yes,
      },
      lineChoiceId: THE_BEST_CHOICE_IDS.lineWho,
    });
    expect(read.headline).toBe("YOU WOULDN'T GIVE THE NAME.");
    expect(read.bodyLines[0]).toBe("YOU'D ASK FOR IT.");
  });

  it("detects Q3 disclose + Q4 withhold inverse pattern", () => {
    const read = buildTheBestTodaysRead({
      choices: {
        1: THE_BEST_CHOICE_IDS.q1No,
        2: THE_BEST_CHOICE_IDS.q2No,
        3: THE_BEST_CHOICE_IDS.q3Name,
        4: THE_BEST_CHOICE_IDS.q4No,
      },
      lineChoiceId: THE_BEST_CHOICE_IDS.lineEx,
    });
    expect(read.headline).toBe("YOU'D GIVE THE NAME.");
    expect(read.bodyLines[0]).toBe("YOU WOULDN'T ASK FOR IT.");
  });

  it("detects held throughout disclose", () => {
    const read = buildTheBestTodaysRead({
      choices: {
        1: THE_BEST_CHOICE_IDS.q1No,
        2: THE_BEST_CHOICE_IDS.q2No,
        3: THE_BEST_CHOICE_IDS.q3Name,
        4: THE_BEST_CHOICE_IDS.q4Yes,
      },
      lineChoiceId: THE_BEST_CHOICE_IDS.lineWhyBetter,
    });
    expect(read.headline).toBe("YOU CHOSE THE TRUTH.");
  });

  it("uses separate storage keys for A and B", () => {
    expect(THE_BEST_REHEARSAL_STORAGE_KEY).toBe("marshmallow-the-best-rehearsal");
    expect(THE_BEST_YOU_SURE_REHEARSAL_STORAGE_KEY).toBe("marshmallow-the-best-you-sure-rehearsal");
    expect(initialTheBestRehearsalState().phase).toBe("intro");
    expect(initialTheBestYouSureRehearsalState().phase).toBe("intro");
  });
});

describe("the-best you sure reactions", () => {
  it("uses conversational Q1 reactions", () => {
    expect(youSureQ1Reaction(THE_BEST_CHOICE_IDS.q1Yes).headline).toBe("YOU SAID YES.");
    expect(youSureQ1Reaction(THE_BEST_CHOICE_IDS.q1No).supportingLine).toBe("You sure?");
  });

  it("uses Q2 hold/move reactions", () => {
    const held = youSureQ2Reaction({
      1: THE_BEST_CHOICE_IDS.q1Yes,
      2: THE_BEST_CHOICE_IDS.q2StillYes,
    });
    expect(held.headline).toBe("STILL SURE.");

    const moved = youSureQ2Reaction({
      1: THE_BEST_CHOICE_IDS.q1Yes,
      2: THE_BEST_CHOICE_IDS.q2No,
    });
    expect(moved.headline).toBe("THAT MOVED YOU.");
  });

  it("uses Q3 semantic reactions", () => {
    const reaction = youSureQ3Reaction({
      1: THE_BEST_CHOICE_IDS.q1No,
      2: THE_BEST_CHOICE_IDS.q2No,
      3: THE_BEST_CHOICE_IDS.q3Refuse,
    });
    expect(reaction.headline).toBe("THE TRUTH WAS EASY.");
  });

  it("uses Q4 inverse-side reaction", () => {
    const reaction = youSureQ4Reaction({
      1: THE_BEST_CHOICE_IDS.q1Yes,
      2: THE_BEST_CHOICE_IDS.q2StillYes,
      3: THE_BEST_CHOICE_IDS.q3Refuse,
      4: THE_BEST_CHOICE_IDS.q4Yes,
    });
    expect(reaction?.headline).toBe("DIFFERENT FROM THIS SIDE.");
  });
});
