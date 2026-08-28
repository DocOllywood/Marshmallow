import type { ExperimentStage } from "@/domain/daily/experiment";
import type { ExperimentTrajectory, TrajectoryInputStage } from "@/domain/daily/trajectory";
import type { TensionSide } from "@/domain/daily/tension";

/** Reuses editorial pressure_type taxonomy; cost_type mirrors optional finer grain. */
export const PRICE_COST_TYPES = [
  "PERSONAL_COST",
  "MONEY",
  "STATUS",
  "BELONGING",
  "REPUTATION",
  "RELATIONSHIP",
  "CONVENIENCE",
  "HARM_TO_OTHERS",
  "CAREER",
  "TIME",
] as const;

export type PriceCostType = (typeof PRICE_COST_TYPES)[number];

export type PriceStageCost = {
  stage: ExperimentStage;
  position: number;
  costType: string | null;
  costLevel: number | null;
  costLabel: string | null;
  side: TensionSide | null;
};

export type PriceTrajectory = {
  startingSide: TensionSide | null;
  finalSide: TensionSide | null;
  firstMovementStage: ExperimentStage | null;
  firstMovementCostType: string | null;
  firstMovementCostLevel: number | null;
  firstMovementCostLabel: string | null;
  heldThroughout: boolean;
  movementCount: number;
  returnedToOriginalPosition: boolean;
  lineChoice: string | null;
  stageCosts: PriceStageCost[];
};

export type PriceCrowdHeldPoint = {
  stage: ExperimentStage;
  position: number;
  stageLabel: string;
  costLabel: string;
  heldPct: number;
};

export type PriceCrowdHeldTrajectory = {
  points: PriceCrowdHeldPoint[];
  referenceSide: "left" | "right";
};

export function isPriceCostType(value: string | null): value is PriceCostType {
  if (!value) return false;
  return (PRICE_COST_TYPES as readonly string[]).includes(value);
}

export function priceStageMicrocopy(stage: ExperimentStage): string | null {
  switch (stage) {
    case "instinct":
      return "What do you do?";
    case "pressure":
      return "Now it costs you something.";
    case "consequence":
      return "Now it costs considerably more.";
    case "flip":
      return "Now you're the person paying the price.";
    case "line":
      return "Where does your answer finally change?";
    default:
      return null;
  }
}

export function priceStagePresentationLabel(stage: ExperimentStage): string {
  switch (stage) {
    case "instinct":
      return "INSTINCT";
    case "pressure":
      return "THE COST";
    case "consequence":
      return "THE PRICE RISES";
    case "flip":
      return "FLIP";
    case "line":
      return "THE LINE";
  }
}

export function buildPriceTrajectory(
  trajectory: ExperimentTrajectory,
  stages: readonly TrajectoryInputStage[],
): PriceTrajectory {
  const binaryStages = [...stages]
    .filter((item) => !item.isLine && item.stage !== "line")
    .sort((a, b) => a.position - b.position);

  const stageCosts: PriceStageCost[] = binaryStages
    .filter((item) => item.choiceLabel != null)
    .map((item) => ({
      stage: item.stage,
      position: item.position,
      costType: item.costType ?? item.pressureType,
      costLevel: item.costLevel ?? null,
      costLabel: item.costLabel ?? null,
      side: item.tensionSide,
    }));

  let firstMovementCostType: string | null = null;
  let firstMovementCostLevel: number | null = null;
  let firstMovementCostLabel: string | null = null;

  if (trajectory.firstMovementStage) {
    const stage = stageCosts.find((item) => item.stage === trajectory.firstMovementStage);
    firstMovementCostType = stage?.costType ?? trajectory.firstMovementPressureType;
    firstMovementCostLevel = stage?.costLevel ?? null;
    firstMovementCostLabel = stage?.costLabel ?? null;
  }

  return {
    startingSide: trajectory.initialSide,
    finalSide: trajectory.finalSide,
    firstMovementStage: trajectory.firstMovementStage,
    firstMovementCostType,
    firstMovementCostLevel,
    firstMovementCostLabel,
    heldThroughout: trajectory.heldThroughout,
    movementCount: trajectory.movementCount,
    returnedToOriginalPosition: trajectory.returnedToOriginalPosition,
    lineChoice: trajectory.lineChoice,
    stageCosts,
  };
}

export type PriceCrowdStageInput = {
  stage: ExperimentStage;
  position: number;
  leftPct: number;
  rightPct: number;
  costLabel: string | null;
};

export function buildPriceCrowdHeldTrajectory(input: {
  stages: readonly PriceCrowdStageInput[];
  referenceSide: "left" | "right";
}): PriceCrowdHeldTrajectory | null {
  const sorted = [...input.stages]
    .filter((item) => item.stage !== "line")
    .sort((a, b) => a.position - b.position);

  if (sorted.length === 0) {
    return null;
  }

  const points: PriceCrowdHeldPoint[] = sorted.map((stage, index) => {
    const heldPct =
      input.referenceSide === "left" ? Math.round(stage.leftPct) : Math.round(stage.rightPct);
    const costLabel =
      stage.costLabel?.trim() ||
      (index === 0 ? "First call" : priceStagePresentationLabel(stage.stage));

    return {
      stage: stage.stage,
      position: stage.position,
      stageLabel: priceStagePresentationLabel(stage.stage),
      costLabel,
      heldPct,
    };
  });

  return {
    points,
    referenceSide: input.referenceSide,
  };
}

export function containsForbiddenPriceWording(text: string): boolean {
  const forbidden = [
    /\byour price is\b/i,
    /\bcan be bought for\b/i,
    /\bbought for \$/i,
    /\bhypocrit/i,
    /\binconsistent\b/i,
    /\bpriceless\b/i,
  ];
  return forbidden.some((pattern) => pattern.test(text));
}
