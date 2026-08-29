import { describe, expect, it } from "vitest";

import {
  buildExperimentStageReaction,
  resolveExperimentStageReactionType,
} from "@/domain/daily/experiment-stage-reaction";

describe("buildExperimentStageReaction", () => {
  it("returns first-call reaction after Q1", () => {
    const reaction = buildExperimentStageReaction({
      stage: "instinct",
      previousSide: null,
      currentSide: "left",
    });

    expect(reaction.reactionType).toBe("first_call");
    expect(reaction.headline).toBe("THAT'S YOUR FIRST CALL.");
    expect(reaction.supportingLine).toMatch(/where you started/i);
    expect(reaction.nextTease).toBe("Now change one thing.");
    expect(reaction.mascotState).toBe("fluffy");
  });

  it("returns held reaction after Q2", () => {
    const reaction = buildExperimentStageReaction({
      stage: "pressure",
      previousSide: "left",
      currentSide: "left",
      initialSide: "left",
    });

    expect(reaction.reactionType).toBe("held");
    expect(reaction.headline).toBe("YOU HELD.");
    expect(reaction.supportingLine).toMatch(/wasn't enough/i);
    expect(reaction.nextTease).toBe("Now make it cost something.");
    expect(reaction.mascotState).toBe("thinking");
  });

  it("returns moved reaction after Q2", () => {
    const reaction = buildExperimentStageReaction({
      stage: "pressure",
      previousSide: "left",
      currentSide: "right",
      initialSide: "left",
    });

    expect(reaction.reactionType).toBe("moved");
    expect(reaction.headline).toBe("YOU MOVED.");
    expect(reaction.supportingLine).toMatch(/new fact/i);
  });

  it("returns moved-back reaction when returning to Q1 side", () => {
    const reaction = buildExperimentStageReaction({
      stage: "pressure",
      previousSide: "right",
      currentSide: "left",
      initialSide: "left",
    });

    expect(reaction.reactionType).toBe("moved_back");
    expect(reaction.headline).toBe("YOU MOVED BACK.");
  });

  it("uses non-money cost wording when price did not move the player", () => {
    const reaction = buildExperimentStageReaction({
      stage: "consequence",
      previousSide: "left",
      currentSide: "left",
      costType: "TIME",
      costLabel: "26 weekends",
      archetype: "price",
    });

    expect(reaction.reactionType).toBe("held");
    expect(reaction.headline).toBe("THE TIME COST DIDN'T MOVE YOU.");
    expect(reaction.nextTease).toBe("Now switch sides.");
  });

  it("uses money wording when salary cost moved the player", () => {
    const reaction = buildExperimentStageReaction({
      stage: "consequence",
      previousSide: "left",
      currentSide: "right",
      costType: "CAREER",
      costLabel: "$68,000 salary",
      archetype: "price",
    });

    expect(reaction.reactionType).toBe("moved");
    expect(reaction.headline).toBe("THE PRICE MOVED YOU.");
  });

  it("returns flip-held reaction on Q4", () => {
    const reaction = buildExperimentStageReaction({
      stage: "flip",
      previousSide: "left",
      currentSide: "left",
    });

    expect(reaction.reactionType).toBe("flip_held");
    expect(reaction.headline).toBe("SAME CALL. OTHER SIDE.");
    expect(reaction.nextTease).toBe("Now draw the Line.");
  });

  it("returns flip-moved reaction on Q4", () => {
    const reaction = buildExperimentStageReaction({
      stage: "flip",
      previousSide: "left",
      currentSide: "right",
    });

    expect(reaction.reactionType).toBe("flip_moved");
    expect(reaction.headline).toBe("THE FLIP CHANGED IT.");
    expect(reaction.mascotState).toBe("toasted");
  });

  it("classifies reaction types deterministically", () => {
    expect(
      resolveExperimentStageReactionType({
        stage: "instinct",
        previousSide: null,
        currentSide: "right",
      }),
    ).toBe("first_call");

    expect(
      resolveExperimentStageReactionType({
        stage: "consequence",
        previousSide: "right",
        currentSide: "left",
        initialSide: "left",
      }),
    ).toBe("moved_back");
  });
});

describe("legacy experiment daily compatibility", () => {
  it("supports default archetype reactions without price-specific headline forcing", () => {
    const reaction = buildExperimentStageReaction({
      stage: "pressure",
      previousSide: "left",
      currentSide: "right",
      archetype: "default",
    });

    expect(reaction.headline).toBe("YOU MOVED.");
    expect(reaction.nextTease).toBe("Now make it cost something.");
  });
});
