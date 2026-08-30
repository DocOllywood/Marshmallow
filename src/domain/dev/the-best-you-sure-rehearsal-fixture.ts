import {
  THE_BEST_STAGES,
  theBestChoiceSide,
  type TheBestRehearsalChoices,
  type TheBestStageContent,
} from "@/domain/content/the-best-experiment";
import { buildRehearsalTheBestTodaysRead, type TheBestRehearsalState } from "@/domain/dev/the-best-rehearsal-fixture";

export const THE_BEST_YOU_SURE_REHEARSAL_STORAGE_KEY = "marshmallow-the-best-you-sure-rehearsal";

export type YouSureReaction = {
  headline: string;
  supportingLine?: string;
};

export type YouSurePhase =
  | "intro"
  | "q1-play"
  | "q1-react"
  | "q2-play"
  | "q2-react"
  | "q3-play"
  | "q3-react"
  | "switch-sides"
  | "q4-play"
  | "q4-react"
  | "q4-predict"
  | "line-play"
  | "line-locked"
  | "todays-read"
  | "outside"
  | "complete";

export type TheBestYouSureRehearsalState = {
  phase: YouSurePhase;
  choices: TheBestRehearsalChoices;
  flipPrediction: [number, number];
  lineChoiceId: string | null;
};

export function initialTheBestYouSureRehearsalState(): TheBestYouSureRehearsalState {
  return {
    phase: "intro",
    choices: {},
    flipPrediction: [50, 50],
    lineChoiceId: null,
  };
}

export function youSureStageForPhase(phase: YouSurePhase): TheBestStageContent | null {
  if (phase === "q1-play" || phase === "q1-react") return THE_BEST_STAGES[0]!;
  if (phase === "q2-play" || phase === "q2-react") return THE_BEST_STAGES[1]!;
  if (phase === "q3-play" || phase === "q3-react" || phase === "switch-sides") return THE_BEST_STAGES[2]!;
  if (phase === "q4-play" || phase === "q4-react" || phase === "q4-predict") return THE_BEST_STAGES[3]!;
  if (phase === "line-play" || phase === "line-locked") return THE_BEST_STAGES[4]!;
  return null;
}

function sideAt(choices: TheBestRehearsalChoices, position: number) {
  const stage = THE_BEST_STAGES.find((row) => row.position === position);
  const choiceId = choices[position];
  if (!stage || !choiceId) return null;
  return theBestChoiceSide(stage, choiceId);
}

export function youSureQ1Reaction(choiceId: string): YouSureReaction {
  const side = theBestChoiceSide(THE_BEST_STAGES[0]!, choiceId);
  if (side === "left") {
    return { headline: "YOU SAID YES.", supportingLine: "You sure?" };
  }
  return { headline: "YOU SAID NO.", supportingLine: "You sure?" };
}

export function youSureQ2Reaction(choices: TheBestRehearsalChoices): YouSureReaction {
  const q1Side = sideAt(choices, 1);
  const q2Side = sideAt(choices, 2);
  if (q1Side && q2Side && q1Side === q2Side) {
    return { headline: "STILL SURE.", supportingLine: "Okay.\n\nOne more thing." };
  }
  return { headline: "THAT MOVED YOU.", supportingLine: "Okay.\n\nOne more thing." };
}

export function youSureQ3Reaction(choices: TheBestRehearsalChoices): YouSureReaction {
  const q2Side = sideAt(choices, 2);
  const q3Side = sideAt(choices, 3);
  if (q2Side === "right" && q3Side === "left") {
    return { headline: "THE TRUTH WAS EASY.", supportingLine: "THE NAME WASN'T." };
  }
  if (q3Side === "left") {
    return { headline: "STILL NO." };
  }
  if (q2Side === "left" && q3Side === "right") {
    return { headline: "THERE IT IS." };
  }
  return { headline: "THAT MOVED YOU." };
}

export function youSureQ4Reaction(choices: TheBestRehearsalChoices): YouSureReaction | null {
  const q3Side = sideAt(choices, 3);
  const q4Side = sideAt(choices, 4);
  if (q3Side === "left" && q4Side === "right") {
    return { headline: "DIFFERENT FROM THIS SIDE." };
  }
  if (q3Side && q4Side && q3Side === q4Side) {
    return { headline: "SAME CALL. OTHER SIDE." };
  }
  if (q3Side && q4Side && q3Side !== q4Side) {
    return { headline: "YOU MOVED." };
  }
  return null;
}

export function buildYouSureTodaysRead(state: TheBestYouSureRehearsalState) {
  const shared: TheBestRehearsalState = {
    phase: "todays-read",
    stageIndex: 4,
    choices: state.choices,
    flipPrediction: state.flipPrediction,
    lineChoiceId: state.lineChoiceId,
  };
  return buildRehearsalTheBestTodaysRead(shared);
}

export { THE_BEST_STAGES, theBestChoiceSide };
