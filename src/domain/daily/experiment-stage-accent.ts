import type { ExperimentStage } from "@/domain/daily/experiment";

/** Progressive sage accent tokens — one tonal family, lightest → deepest. */
export const EXPERIMENT_STAGE_ACCENT_VARS: Record<ExperimentStage, string> = {
  instinct: "--money-stage-1",
  pressure: "--money-stage-2",
  consequence: "--money-stage-3",
  flip: "--money-stage-4",
  line: "--money-stage-5",
};

export function experimentStageAccentVar(stage: ExperimentStage): string {
  return EXPERIMENT_STAGE_ACCENT_VARS[stage];
}

export function experimentStageAccentStyle(stage: ExperimentStage): { color: string } {
  return { color: `var(${experimentStageAccentVar(stage)})` };
}
