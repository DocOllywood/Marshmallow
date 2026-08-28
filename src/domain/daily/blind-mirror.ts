import type { BeliefPrinciple, ExperimentContext } from "@/domain/daily/principle";
import type { HumanTension, TensionSide } from "@/domain/daily/tension";
import { sideLabelForTension } from "@/domain/daily/experiment-play";
import { buildExperimentTrajectory, type TrajectoryInputStage } from "@/domain/daily/trajectory";

export type BlindMirrorComparisonType =
  | "SAME_RULE_SAME_CALL"
  | "SAME_RULE_DIFFERENT_CALL"
  | "SAME_START_DIFFERENT_FINISH"
  | "DIFFERENT_START_SAME_FINISH"
  | "LINE_MOVED";

export type BlindMirrorRoundSnapshot = {
  roundId: string;
  roundDate: string;
  context: ExperimentContext;
  trajectoryInputs: TrajectoryInputStage[];
  tension: HumanTension;
};

export type BlindMirrorComparison = {
  principleId: string;
  principleLabel: string;
  earlierRoundId: string;
  laterRoundId: string;
  earlierContext: ExperimentContext;
  laterContext: ExperimentContext;
  earlierInitialSide: TensionSide | null;
  laterInitialSide: TensionSide | null;
  earlierFinalSide: TensionSide | null;
  laterFinalSide: TensionSide | null;
  earlierLine: string | null;
  laterLine: string | null;
  sameInitialPosition: boolean;
  sameFinalPosition: boolean;
  lineChanged: boolean;
  comparisonType: BlindMirrorComparisonType;
  headline: string;
  earlierResultLabel: string;
  laterResultLabel: string;
};

function isTrackableSide(side: TensionSide | null): side is "left" | "right" {
  return side === "left" || side === "right";
}

export function classifyBlindMirrorComparison(input: {
  earlierInitialSide: TensionSide | null;
  laterInitialSide: TensionSide | null;
  earlierFinalSide: TensionSide | null;
  laterFinalSide: TensionSide | null;
  earlierLine: string | null;
  laterLine: string | null;
}): BlindMirrorComparisonType {
  const sameInitial =
    isTrackableSide(input.earlierInitialSide) &&
    isTrackableSide(input.laterInitialSide) &&
    input.earlierInitialSide === input.laterInitialSide;
  const sameFinal =
    isTrackableSide(input.earlierFinalSide) &&
    isTrackableSide(input.laterFinalSide) &&
    input.earlierFinalSide === input.laterFinalSide;
  const lineChanged =
    input.earlierLine != null &&
    input.laterLine != null &&
    input.earlierLine !== input.laterLine;

  if (lineChanged) {
    return "LINE_MOVED";
  }
  if (sameInitial && sameFinal) {
    return "SAME_RULE_SAME_CALL";
  }
  if (sameInitial && !sameFinal) {
    return "SAME_START_DIFFERENT_FINISH";
  }
  if (!sameInitial && sameFinal) {
    return "DIFFERENT_START_SAME_FINISH";
  }
  return "SAME_RULE_DIFFERENT_CALL";
}

export function blindMirrorHeadline(type: BlindMirrorComparisonType): string {
  switch (type) {
    case "SAME_RULE_SAME_CALL":
    case "DIFFERENT_START_SAME_FINISH":
      return "YOUR ANSWER HELD ACROSS BOTH SITUATIONS.";
    case "SAME_RULE_DIFFERENT_CALL":
      return "SAME RULE. DIFFERENT CALL.";
    case "SAME_START_DIFFERENT_FINISH":
      return "YOU STARTED THE SAME WAY. YOU ENDED SOMEWHERE DIFFERENT.";
    case "LINE_MOVED":
      return "YOUR LINE MOVED.";
  }
}

function finalSideLabel(tension: HumanTension, side: TensionSide | null): string {
  if (!isTrackableSide(side)) {
    return "—";
  }
  return sideLabelForTension(tension, side) ?? side.toUpperCase();
}

export function buildBlindMirrorComparison(input: {
  principle: BeliefPrinciple;
  earlier: BlindMirrorRoundSnapshot;
  later: BlindMirrorRoundSnapshot;
}): BlindMirrorComparison | null {
  const earlierTrajectory = buildExperimentTrajectory(input.earlier.trajectoryInputs);
  const laterTrajectory = buildExperimentTrajectory(input.later.trajectoryInputs);

  if (!earlierTrajectory || !laterTrajectory) {
    return null;
  }

  const earlierInitialSide = earlierTrajectory.initialSide;
  const laterInitialSide = laterTrajectory.initialSide;
  const earlierFinalSide = earlierTrajectory.finalSide;
  const laterFinalSide = laterTrajectory.finalSide;

  if (
    !isTrackableSide(earlierInitialSide) ||
    !isTrackableSide(laterInitialSide) ||
    !isTrackableSide(earlierFinalSide) ||
    !isTrackableSide(laterFinalSide)
  ) {
    return null;
  }

  const earlierLine = earlierTrajectory.lineChoice;
  const laterLine = laterTrajectory.lineChoice;
  const comparisonType = classifyBlindMirrorComparison({
    earlierInitialSide,
    laterInitialSide,
    earlierFinalSide,
    laterFinalSide,
    earlierLine,
    laterLine,
  });

  return {
    principleId: input.principle.id,
    principleLabel: input.principle.displayName,
    earlierRoundId: input.earlier.roundId,
    laterRoundId: input.later.roundId,
    earlierContext: input.earlier.context,
    laterContext: input.later.context,
    earlierInitialSide,
    laterInitialSide,
    earlierFinalSide,
    laterFinalSide,
    earlierLine,
    laterLine,
    sameInitialPosition: earlierInitialSide === laterInitialSide,
    sameFinalPosition: earlierFinalSide === laterFinalSide,
    lineChanged: earlierLine !== laterLine && earlierLine != null && laterLine != null,
    comparisonType,
    headline: blindMirrorHeadline(comparisonType),
    earlierResultLabel: finalSideLabel(input.earlier.tension, earlierFinalSide),
    laterResultLabel: finalSideLabel(input.later.tension, laterFinalSide),
  };
}

export function findBlindMirrorPair(input: {
  principle: BeliefPrinciple;
  currentRoundId: string;
  currentRoundDate: string;
  snapshots: readonly BlindMirrorRoundSnapshot[];
}): BlindMirrorComparison | null {
  const current = input.snapshots.find((item) => item.roundId === input.currentRoundId);
  if (!current) {
    return null;
  }

  const prior = [...input.snapshots]
    .filter(
      (item) =>
        item.roundId !== input.currentRoundId && item.roundDate < input.currentRoundDate,
    )
    .sort((a, b) => b.roundDate.localeCompare(a.roundDate))[0];

  if (!prior) {
    return null;
  }

  const earlier = prior.roundDate <= current.roundDate ? prior : current;
  const later = prior.roundDate <= current.roundDate ? current : prior;

  return buildBlindMirrorComparison({
    principle: input.principle,
    earlier,
    later,
  });
}
