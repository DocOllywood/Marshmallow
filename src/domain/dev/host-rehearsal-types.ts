import type { ExperimentStage } from "@/domain/daily/experiment";
import type { TensionSide } from "@/domain/daily/tension";
import type { TodaysRead } from "@/domain/daily/todays-read";

export type HostReaction = {
  headline: string;
  supportingLine?: string;
};

export type HostPhase =
  | "intro"
  | "q1-play"
  | "q1-react"
  | "q2-play"
  | "q2-react"
  | "q3-play"
  | "q3-react"
  | "q4-play"
  | "q4-react"
  | "q4-predict"
  | "line-play"
  | "todays-read"
  | "complete";

export type HostPlayChoices = Record<number, string>;

export type HostPlayState = {
  phase: HostPhase;
  choices: HostPlayChoices;
  flipPrediction: [number, number];
  lineChoiceId: string | null;
};

export type HostContentChoice = {
  id: string;
  label: string;
  tensionSide: TensionSide;
};

export type HostContentStage = {
  position: number;
  stage: ExperimentStage;
  question: string;
  choices: readonly HostContentChoice[];
  isLine?: boolean;
};

export type HostReadTheRoomPrompt = {
  lead: string;
  question: string;
};

export type HostExperimentReactions = {
  q1: (choiceId: string) => HostReaction;
  q2: (choices: HostPlayChoices) => HostReaction;
  q3: (choices: HostPlayChoices) => HostReaction;
  q4: (choices: HostPlayChoices) => HostReaction;
  readTheRoom: (choices: HostPlayChoices) => HostReadTheRoomPrompt;
};

export type HostExperimentConfig = {
  id: string;
  title: string;
  labSubtitle: string;
  introLine: string;
  stages: readonly HostContentStage[];
  reactions: HostExperimentReactions;
  buildTodaysRead: (input: { choices: HostPlayChoices; lineChoiceId: string | null }) => TodaysRead;
  /** Quiet fallback when no authored read matches. New experiments default here. */
  fallbackReadHeadline?: string;
};

export function initialHostPlayState(): HostPlayState {
  return {
    phase: "intro",
    choices: {},
    flipPrediction: [50, 50],
    lineChoiceId: null,
  };
}

export function hostStageForPhase(
  stages: readonly HostContentStage[],
  phase: HostPhase,
): HostContentStage | null {
  if (phase === "q1-play" || phase === "q1-react") return stages[0] ?? null;
  if (phase === "q2-play" || phase === "q2-react") return stages[1] ?? null;
  if (phase === "q3-play" || phase === "q3-react") return stages[2] ?? null;
  if (phase === "q4-play" || phase === "q4-react" || phase === "q4-predict") return stages[3] ?? null;
  if (phase === "line-play") return stages[4] ?? null;
  return null;
}

export function hostChoiceSide(stage: HostContentStage, choiceId: string): TensionSide | null {
  return stage.choices.find((choice) => choice.id === choiceId)?.tensionSide ?? null;
}

export function hostSideAt(
  stages: readonly HostContentStage[],
  choices: HostPlayChoices,
  position: number,
): TensionSide | null {
  const stage = stages.find((row) => row.position === position);
  const choiceId = choices[position];
  if (!stage || !choiceId) return null;
  return hostChoiceSide(stage, choiceId);
}

export function hostLineLabel(stages: readonly HostContentStage[], lineChoiceId: string | null): string | null {
  if (!lineChoiceId) return null;
  const lineStage = stages.find((stage) => stage.isLine);
  return lineStage?.choices.find((choice) => choice.id === lineChoiceId)?.label ?? null;
}

export function hostQuietFallbackRead(
  lineCopy: string | null,
  headline = "THAT'S WHERE YOU LANDED.",
): TodaysRead {
  return {
    headline,
    bodyLines: [],
    lineCopy,
    switchCopy: null,
    tomorrowTease: null,
    isLegacy: false,
    isExperiment: true,
  };
}
