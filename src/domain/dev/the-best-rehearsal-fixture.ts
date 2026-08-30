import {
  buildTheBestTodaysRead,
  buildTheBestTrajectory,
  THE_BEST_STAGES,
  theBestChoiceSide,
  type TheBestRehearsalChoices,
  type TheBestStageContent,
} from "@/domain/content/the-best-experiment";

export const THE_BEST_REHEARSAL_STORAGE_KEY = "marshmallow-the-best-rehearsal";

export type TheBestRehearsalPhase =
  | "intro"
  | "play"
  | "locked"
  | "flip-predict"
  | "line-locked"
  | "todays-read"
  | "outside"
  | "complete";

export type TheBestRehearsalState = {
  phase: TheBestRehearsalPhase;
  stageIndex: number;
  choices: TheBestRehearsalChoices;
  flipPrediction: [number, number];
  lineChoiceId: string | null;
};

export function initialTheBestRehearsalState(): TheBestRehearsalState {
  return {
    phase: "intro",
    stageIndex: 0,
    choices: {},
    flipPrediction: [50, 50],
    lineChoiceId: null,
  };
}

export function currentTheBestStage(state: TheBestRehearsalState): TheBestStageContent {
  return THE_BEST_STAGES[state.stageIndex] ?? THE_BEST_STAGES[0]!;
}

export function buildRehearsalTheBestTodaysRead(state: TheBestRehearsalState) {
  return buildTheBestTodaysRead({
    choices: state.choices,
    lineChoiceId: state.lineChoiceId,
  });
}

export function theBestRehearsalTrajectory(state: TheBestRehearsalState) {
  return buildTheBestTrajectory({
    choices: state.choices,
    lineChoiceId: state.lineChoiceId,
  });
}

export { theBestChoiceSide, THE_BEST_STAGES };
