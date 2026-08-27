import type { ExperimentStage } from "@/domain/daily/experiment";
import { experimentStageLabel } from "@/domain/daily/experiment";
import type { HumanTension, TensionSide } from "@/domain/daily/tension";

export type CrowdTrajectoryPoint = {
  stage: ExperimentStage;
  position: number;
  stageLabel: string;
  sideLabel: string;
  crowdPct: number;
  side: "left" | "right";
};

export type ExperimentCrowdTrajectory = {
  points: CrowdTrajectoryPoint[];
  crowdFirstMovementStage: ExperimentStage | null;
  crowdFirstMovementStageLabel: string | null;
  referenceSide: "left" | "right";
};

export type CrowdStageInput = {
  stage: ExperimentStage;
  position: number;
  leftPct: number;
  rightPct: number;
};

function trackablePct(side: "left" | "right", input: CrowdStageInput): number {
  return side === "left" ? input.leftPct : input.rightPct;
}

export function buildExperimentCrowdTrajectory(input: {
  stages: readonly CrowdStageInput[];
  tension: HumanTension;
  referenceSide?: "left" | "right";
}): ExperimentCrowdTrajectory | null {
  const sorted = [...input.stages]
    .filter((item) => item.stage !== "line")
    .sort((a, b) => a.position - b.position);

  if (sorted.length === 0) {
    return null;
  }

  const referenceSide = input.referenceSide ?? "left";
  const sideLabel =
    referenceSide === "left" ? input.tension.leftLabel : input.tension.rightLabel;

  const points: CrowdTrajectoryPoint[] = sorted.map((stage) => ({
    stage: stage.stage,
    position: stage.position,
    stageLabel: experimentStageLabel(stage.stage).toUpperCase(),
    sideLabel,
    crowdPct: Math.round(trackablePct(referenceSide, stage)),
    side: referenceSide,
  }));

  let crowdFirstMovementStage: ExperimentStage | null = null;

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = trackablePct(referenceSide, sorted[index - 1]!);
    const current = trackablePct(referenceSide, sorted[index]!);
    if (Math.round(current) !== Math.round(previous)) {
      crowdFirstMovementStage = sorted[index]!.stage;
      break;
    }
  }

  return {
    points,
    crowdFirstMovementStage,
    crowdFirstMovementStageLabel: crowdFirstMovementStage
      ? experimentStageLabel(crowdFirstMovementStage).toUpperCase()
      : null,
    referenceSide,
  };
}

export function crowdSidePctFromResults(input: {
  choices: readonly { id: string; metadata?: unknown }[];
  results: readonly { choice_id: string; vote_pct: number }[];
  side: TensionSide;
}): number {
  const idsForSide = input.choices
    .filter((choice) => {
      const meta = choice.metadata;
      if (!meta || typeof meta !== "object") return false;
      return (meta as { tension_side?: string }).tension_side === input.side;
    })
    .map((choice) => choice.id);

  if (idsForSide.length === 0) {
    return 0;
  }

  return idsForSide.reduce((sum, id) => {
    const row = input.results.find((result) => result.choice_id === id);
    return sum + Number(row?.vote_pct ?? 0);
  }, 0);
}

export function describeCrowdMovement(trajectory: ExperimentCrowdTrajectory): string | null {
  void trajectory;
  return null;
}
