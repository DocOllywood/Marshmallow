import type { ExperimentStage } from "@/domain/daily/experiment";
import type { TensionSide } from "@/domain/daily/tension";

export type TrajectoryStageChoice = {
  stage: ExperimentStage;
  position: number;
  side: TensionSide | null;
  choiceLabel: string;
  pressureType: string | null;
};

export type ExperimentTrajectory = {
  initialSide: TensionSide | null;
  finalSide: TensionSide | null;
  heldThroughout: boolean;
  moved: boolean;
  firstMovementStage: ExperimentStage | null;
  firstMovementPressureType: string | null;
  movementCount: number;
  returnedToOriginalPosition: boolean;
  stageChoices: TrajectoryStageChoice[];
  lineChoice: string | null;
};

export type TrajectoryInputStage = {
  stage: ExperimentStage;
  position: number;
  choiceLabel: string | null;
  tensionSide: TensionSide | null;
  pressureType: string | null;
  costType?: string | null;
  costLevel?: number | null;
  costLabel?: string | null;
  isLine: boolean;
};

function isTrackableSide(side: TensionSide | null): side is "left" | "right" {
  return side === "left" || side === "right";
}

export function buildExperimentTrajectory(
  stages: readonly TrajectoryInputStage[],
): ExperimentTrajectory | null {
  const binaryStages = [...stages]
    .filter((item) => !item.isLine && item.stage !== "line")
    .sort((a, b) => a.position - b.position);

  const lineStage = stages.find((item) => item.isLine || item.stage === "line");

  const stageChoices: TrajectoryStageChoice[] = binaryStages
    .filter((item) => item.choiceLabel != null)
    .map((item) => ({
      stage: item.stage,
      position: item.position,
      side: item.tensionSide,
      choiceLabel: item.choiceLabel!,
      pressureType: item.pressureType,
    }));

  if (stageChoices.length === 0) {
    return null;
  }

  const trackable = stageChoices.filter((item) => isTrackableSide(item.side));
  const initialSide = trackable[0]?.side ?? null;
  const finalSide = trackable.at(-1)?.side ?? null;

  let movementCount = 0;
  let firstMovementStage: ExperimentStage | null = null;
  let firstMovementPressureType: string | null = null;

  for (let index = 1; index < trackable.length; index += 1) {
    const previous = trackable[index - 1]!;
    const current = trackable[index]!;
    if (previous.side !== current.side) {
      movementCount += 1;
      if (firstMovementStage == null) {
        firstMovementStage = current.stage;
        firstMovementPressureType = current.pressureType;
      }
    }
  }

  const heldThroughout =
    trackable.length > 0 &&
    trackable.every((item) => item.side === trackable[0]!.side);
  const moved = movementCount > 0;
  const returnedToOriginalPosition =
    moved &&
    initialSide != null &&
    finalSide != null &&
    initialSide === finalSide &&
    movementCount >= 1;

  return {
    initialSide,
    finalSide,
    heldThroughout,
    moved,
    firstMovementStage,
    firstMovementPressureType,
    movementCount,
    returnedToOriginalPosition,
    stageChoices,
    lineChoice: lineStage?.choiceLabel ?? null,
  };
}
