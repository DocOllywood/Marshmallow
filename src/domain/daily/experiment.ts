export const EXPERIMENT_VERSION = 1 as const;

export type ExperimentStage = "instinct" | "pressure" | "consequence" | "flip" | "line";

export type MarshmallowExperimentMetadata = {
  stage: ExperimentStage;
  pressureType: string | null;
  requiresPrediction: boolean;
};

export type DailyRoundExperimentMetadata = {
  version: typeof EXPERIMENT_VERSION;
};

const STAGES_BY_POSITION: Record<number, ExperimentStage> = {
  1: "instinct",
  2: "pressure",
  3: "consequence",
  4: "flip",
  5: "line",
};

export function parseDailyRoundExperimentMetadata(
  metadata: unknown,
): DailyRoundExperimentMetadata | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }
  const version = (metadata as { experiment?: { version?: unknown } }).experiment?.version;
  if (version === EXPERIMENT_VERSION) {
    return { version: EXPERIMENT_VERSION };
  }
  return null;
}

export function isExperimentDailyRound(metadata: unknown): boolean {
  return parseDailyRoundExperimentMetadata(metadata) != null;
}

export function parseMarshmallowExperimentMetadata(
  metadata: unknown,
  roundPosition: number | null,
  isLine: boolean,
): MarshmallowExperimentMetadata | null {
  if (metadata && typeof metadata === "object") {
    const experiment = (metadata as { experiment?: Record<string, unknown> }).experiment;
    if (experiment && typeof experiment === "object") {
      const stage = experiment.stage;
      if (
        stage === "instinct" ||
        stage === "pressure" ||
        stage === "consequence" ||
        stage === "flip" ||
        stage === "line"
      ) {
        const pressureType =
          typeof experiment.pressure_type === "string" ? experiment.pressure_type : null;
        const requiresPrediction =
          typeof experiment.requires_prediction === "boolean"
            ? experiment.requires_prediction
            : stage === "flip";
        return {
          stage,
          pressureType,
          requiresPrediction: isLine ? false : requiresPrediction,
        };
      }
    }
  }

  if (roundPosition == null) {
    return null;
  }

  const inferredStage = STAGES_BY_POSITION[roundPosition];
  if (!inferredStage) {
    return null;
  }

  return null;
}

export function resolveMarshmallowExperimentMetadata(input: {
  metadata: unknown;
  roundMetadata: unknown;
  roundPosition: number | null;
  isLine: boolean;
}): MarshmallowExperimentMetadata | null {
  if (!isExperimentDailyRound(input.roundMetadata)) {
    return null;
  }

  const explicit = parseMarshmallowExperimentMetadata(
    input.metadata,
    input.roundPosition,
    input.isLine,
  );
  if (explicit) {
    return explicit;
  }

  if (input.roundPosition == null) {
    return null;
  }

  const stage = STAGES_BY_POSITION[input.roundPosition];
  if (!stage) {
    return null;
  }

  return {
    stage,
    pressureType: null,
    requiresPrediction: stage === "flip",
  };
}

export function marshmallowRequiresPrediction(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") {
    return true;
  }
  const requires = (metadata as { experiment?: { requires_prediction?: unknown } }).experiment
    ?.requires_prediction;
  if (typeof requires === "boolean") {
    return requires;
  }
  return true;
}

export function experimentStageLabel(stage: ExperimentStage): string {
  switch (stage) {
    case "instinct":
      return "Instinct";
    case "pressure":
      return "Pressure";
    case "consequence":
      return "Consequence";
    case "flip":
      return "Flip";
    case "line":
      return "The Line";
  }
}
