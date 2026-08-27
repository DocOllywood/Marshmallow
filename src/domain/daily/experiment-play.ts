import type { ExperimentStage } from "@/domain/daily/experiment";
import { experimentStageLabel } from "@/domain/daily/experiment";
import type { HumanTension, TensionSide } from "@/domain/daily/tension";
import type { ExperimentTrajectory } from "@/domain/daily/trajectory";

export type ExperimentMovementFeedback = "held" | "moved" | null;

export function experimentStageHeaderLabel(stage: ExperimentStage): string {
  if (stage === "line") return "THE LINE";
  return experimentStageLabel(stage).toUpperCase();
}

export function experimentStageNumber(position: number): string {
  return String(position).padStart(2, "0");
}

export function compareExperimentMovement(
  priorSide: TensionSide | null,
  currentSide: TensionSide | null,
): ExperimentMovementFeedback {
  if (
    priorSide == null ||
    currentSide == null ||
    priorSide === "neutral" ||
    currentSide === "neutral"
  ) {
    return null;
  }
  return priorSide === currentSide ? "held" : "moved";
}

export function sideLabelForTension(
  tension: HumanTension | null,
  side: TensionSide | null,
): string | null {
  if (!tension || !side || side === "neutral") return null;
  return side === "left" ? tension.leftLabel : tension.rightLabel;
}

export type UserPathPoint = {
  stage: ExperimentStage;
  stageLabel: string;
  sideLabel: string;
  annotation: string | null;
};

export function buildUserPathPoints(
  trajectory: ExperimentTrajectory,
  tension: HumanTension,
): UserPathPoint[] {
  const points: UserPathPoint[] = [];
  let previousSide: TensionSide | null = null;
  const initialSide =
    trajectory.initialSide === "left" || trajectory.initialSide === "right"
      ? trajectory.initialSide
      : null;

  for (const stage of trajectory.stageChoices) {
    const sideLabel = sideLabelForTension(tension, stage.side) ?? stage.choiceLabel;
    let annotation: string | null = null;

    if (
      (previousSide === "left" || previousSide === "right") &&
      (stage.side === "left" || stage.side === "right") &&
      previousSide !== stage.side
    ) {
      annotation =
        initialSide != null && stage.side === initialSide
          ? "← YOU MOVED BACK"
          : "← YOU MOVED";
    }

    points.push({
      stage: stage.stage,
      stageLabel: experimentStageHeaderLabel(stage.stage),
      sideLabel,
      annotation,
    });
    if (stage.side === "left" || stage.side === "right") {
      previousSide = stage.side;
    }
  }

  return points;
}
