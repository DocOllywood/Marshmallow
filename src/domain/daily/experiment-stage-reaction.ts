import type { ExperimentArchetype, ExperimentStage } from "@/domain/daily/experiment";
import { isMonetaryCostLabel } from "@/domain/daily/price";
import type { TensionSide } from "@/domain/daily/tension";

export type ExperimentStageReactionType =
  | "first_call"
  | "held"
  | "moved"
  | "moved_back"
  | "flip_held"
  | "flip_moved";

export type ExperimentReactionMascotState =
  | "fluffy"
  | "thinking"
  | "sealed"
  | "cooking"
  | "toasted"
  | "celebrating";

export type ExperimentStageReaction = {
  headline: string;
  supportingLine: string;
  nextTease: string;
  mascotState: ExperimentReactionMascotState;
  reactionType: ExperimentStageReactionType;
  stage: ExperimentStage;
};

export type BuildExperimentStageReactionInput = {
  stage: ExperimentStage;
  previousSide: TensionSide | null;
  currentSide: TensionSide | null;
  initialSide?: TensionSide | null;
  costType?: string | null;
  costLabel?: string | null;
  archetype?: ExperimentArchetype;
};

const NEXT_STAGE_TEASE: Partial<Record<ExperimentStage, string>> = {
  instinct: "Now change one thing.",
  pressure: "Now make it cost something.",
  consequence: "Now switch sides.",
  flip: "Now draw the Line.",
};

function trackableSide(side: TensionSide | null | undefined): side is "left" | "right" {
  return side === "left" || side === "right";
}

export function resolveExperimentStageReactionType(
  input: BuildExperimentStageReactionInput,
): ExperimentStageReactionType {
  const { stage, previousSide, currentSide, initialSide } = input;

  if (stage === "instinct") {
    return "first_call";
  }

  if (stage === "flip") {
    if (!trackableSide(previousSide) || !trackableSide(currentSide)) {
      return "flip_moved";
    }
    return previousSide === currentSide ? "flip_held" : "flip_moved";
  }

  if (!trackableSide(previousSide) || !trackableSide(currentSide)) {
    return "moved";
  }

  if (previousSide === currentSide) {
    return "held";
  }

  if (
    trackableSide(initialSide) &&
    currentSide === initialSide &&
    previousSide !== currentSide
  ) {
    return "moved_back";
  }

  return "moved";
}

function costDidNotMoveHeadline(costType: string | null, costLabel: string | null): string {
  if (costType === "MONEY" || isMonetaryCostLabel(costType, costLabel)) {
    return "THE PRICE DIDN'T MOVE YOU.";
  }
  if (costType === "TIME") {
    return "THE TIME COST DIDN'T MOVE YOU.";
  }
  if (costType === "CAREER") {
    return "THE CAREER COST DIDN'T MOVE YOU.";
  }
  if (costType === "REPUTATION") {
    return "THE REPUTATION COST DIDN'T MOVE YOU.";
  }
  if (costType === "RELATIONSHIP") {
    return "THE RELATIONSHIP COST DIDN'T MOVE YOU.";
  }
  return "THE COST DIDN'T MOVE YOU.";
}

function costMovedHeadline(costType: string | null, costLabel: string | null): string {
  if (costType === "MONEY" || isMonetaryCostLabel(costType, costLabel)) {
    return "THE PRICE MOVED YOU.";
  }
  if (costType === "TIME") {
    return "THE TIME COST MOVED YOU.";
  }
  if (costType === "CAREER") {
    return "THE CAREER COST MOVED YOU.";
  }
  if (costType === "REPUTATION") {
    return "THE REPUTATION COST MOVED YOU.";
  }
  if (costType === "RELATIONSHIP") {
    return "THE RELATIONSHIP COST MOVED YOU.";
  }
  return "THE COST MOVED YOU.";
}

function mascotForReaction(
  stage: ExperimentStage,
  reactionType: ExperimentStageReactionType,
): ExperimentReactionMascotState {
  if (reactionType === "first_call") {
    return "fluffy";
  }
  if (stage === "flip") {
    return reactionType === "flip_moved" ? "toasted" : "thinking";
  }
  if (stage === "consequence") {
    return reactionType === "held" || reactionType === "moved_back" ? "sealed" : "toasted";
  }
  if (stage === "pressure") {
    return "thinking";
  }
  return "thinking";
}

function buildHeadlineAndSupport(
  input: BuildExperimentStageReactionInput,
  reactionType: ExperimentStageReactionType,
): { headline: string; supportingLine: string } {
  const { stage, costType = null, costLabel = null } = input;

  if (reactionType === "first_call") {
    return {
      headline: "THAT'S YOUR FIRST CALL.",
      supportingLine: "That's where you started.",
    };
  }

  if (reactionType === "flip_held") {
    return {
      headline: "SAME CALL. OTHER SIDE.",
      supportingLine: "You held from the other side.",
    };
  }

  if (reactionType === "flip_moved") {
    return {
      headline: "THE FLIP CHANGED IT.",
      supportingLine: "Changing sides changed your call.",
    };
  }

  if (reactionType === "held") {
    if (stage === "consequence") {
      return {
        headline: costDidNotMoveHeadline(costType, costLabel),
        supportingLine: "The cost landed. Your call didn't.",
      };
    }
    return {
      headline: "YOU HELD.",
      supportingLine: "That wasn't enough to move you.",
    };
  }

  if (reactionType === "moved_back") {
    return {
      headline: "YOU MOVED BACK.",
      supportingLine: "You're back where you started.",
    };
  }

  if (stage === "consequence") {
    return {
      headline: costMovedHeadline(costType, costLabel),
      supportingLine: "The cost changed your answer.",
    };
  }

  return {
    headline: "YOU MOVED.",
    supportingLine: "One new fact changed your call.",
  };
}

export function buildExperimentStageReaction(
  input: BuildExperimentStageReactionInput,
): ExperimentStageReaction {
  const reactionType = resolveExperimentStageReactionType(input);
  const { headline, supportingLine } = buildHeadlineAndSupport(input, reactionType);
  const nextTease = NEXT_STAGE_TEASE[input.stage] ?? "";

  return {
    headline,
    supportingLine,
    nextTease,
    mascotState: mascotForReaction(input.stage, reactionType),
    reactionType,
    stage: input.stage,
  };
}

export function experimentStageAccentDepth(stage: ExperimentStage): 0 | 1 | 2 | 3 | 4 | 5 {
  switch (stage) {
    case "instinct":
      return 1;
    case "pressure":
      return 2;
    case "consequence":
      return 3;
    case "flip":
      return 4;
    case "line":
      return 5;
    default:
      return 0;
  }
}
