import type { ExperimentStage } from "@/domain/daily/experiment";
import type { TensionSide } from "@/domain/daily/tension";
import type { TodaysRead } from "@/domain/daily/todays-read";
import {
  buildExperimentTrajectory,
  type ExperimentTrajectory,
  type TrajectoryInputStage,
} from "@/domain/daily/trajectory";

export const THE_BEST_TITLE = "THE BEST";

export const THE_BEST_OUTSIDE_COPY = [
  "Some truths hurt.",
  "Some lies protect.",
  "Notice which one you reach for first.",
] as const;

export const THE_BEST_CHOICE_IDS = {
  q1Yes: "the-best-q1-say-yes",
  q1No: "the-best-q1-say-no",
  q2StillYes: "the-best-q2-still-yes",
  q2No: "the-best-q2-say-no",
  q3Refuse: "the-best-q3-refuse",
  q3Name: "the-best-q3-name",
  q4No: "the-best-q4-no",
  q4Yes: "the-best-q4-yes",
  lineDontKnow: "the-best-line-dont-know",
  lineNotBest: "the-best-line-not-best",
  lineEx: "the-best-line-ex",
  lineWho: "the-best-line-who",
  lineWhyBetter: "the-best-line-why-better",
} as const;

export type TheBestChoice = {
  id: string;
  label: string;
  tensionSide: TensionSide;
};

export type TheBestStageContent = {
  position: number;
  stage: ExperimentStage;
  question: string;
  choices: readonly TheBestChoice[];
  isLine?: boolean;
  requiresPrediction?: boolean;
};

export const THE_BEST_STAGES: readonly TheBestStageContent[] = [
  {
    position: 1,
    stage: "instinct",
    question: "Your partner asks:\n\n“Am I the best you've ever had?”\n\nThey're not.",
    choices: [
      { id: THE_BEST_CHOICE_IDS.q1Yes, label: "SAY YES", tensionSide: "left" },
      { id: THE_BEST_CHOICE_IDS.q1No, label: "SAY NO", tensionSide: "right" },
    ],
  },
  {
    position: 2,
    stage: "pressure",
    question: "They say:\n\n“Don't lie to me.”",
    choices: [
      { id: THE_BEST_CHOICE_IDS.q2StillYes, label: "STILL SAY YES", tensionSide: "left" },
      { id: THE_BEST_CHOICE_IDS.q2No, label: "SAY NO", tensionSide: "right" },
    ],
  },
  {
    position: 3,
    stage: "consequence",
    question: "They ask:\n\n“Who was?”",
    choices: [
      { id: THE_BEST_CHOICE_IDS.q3Refuse, label: "REFUSE TO SAY", tensionSide: "left" },
      { id: THE_BEST_CHOICE_IDS.q3Name, label: "SAY A NAME", tensionSide: "right" },
    ],
  },
  {
    position: 4,
    stage: "flip",
    requiresPrediction: true,
    question:
      "Your partner tells you:\n\n“You aren't the best I've ever had.”\n\nWould you ask who was?",
    choices: [
      { id: THE_BEST_CHOICE_IDS.q4No, label: "NO", tensionSide: "left" },
      { id: THE_BEST_CHOICE_IDS.q4Yes, label: "YES", tensionSide: "right" },
    ],
  },
  {
    position: 5,
    stage: "line",
    isLine: true,
    question: "HOW MUCH TRUTH WOULD YOU ACTUALLY WANT?",
    choices: [
      { id: THE_BEST_CHOICE_IDS.lineDontKnow, label: "I DON'T WANT TO KNOW", tensionSide: "left" },
      { id: THE_BEST_CHOICE_IDS.lineNotBest, label: "JUST TELL ME I'M NOT", tensionSide: "left" },
      { id: THE_BEST_CHOICE_IDS.lineEx, label: "TELL ME IF IT WAS AN EX", tensionSide: "neutral" },
      { id: THE_BEST_CHOICE_IDS.lineWho, label: "TELL ME WHO IT WAS", tensionSide: "right" },
      { id: THE_BEST_CHOICE_IDS.lineWhyBetter, label: "TELL ME WHY THEY WERE BETTER", tensionSide: "right" },
    ],
  },
] as const;

export function theBestChoiceSide(stage: TheBestStageContent, choiceId: string): TensionSide | null {
  return stage.choices.find((choice) => choice.id === choiceId)?.tensionSide ?? null;
}

export function theBestLineLabel(choiceId: string | null): string | null {
  if (!choiceId) return null;
  return THE_BEST_STAGES[4]?.choices.find((choice) => choice.id === choiceId)?.label ?? null;
}

export type TheBestRehearsalChoices = Record<number, string>;

export function buildTheBestTrajectoryInputs(input: {
  choices: TheBestRehearsalChoices;
  lineChoiceId: string | null;
}): TrajectoryInputStage[] {
  return THE_BEST_STAGES.map((stage) => {
    const choiceId = stage.isLine ? input.lineChoiceId : input.choices[stage.position];
    const match = choiceId ? stage.choices.find((choice) => choice.id === choiceId) : null;
    return {
      stage: stage.stage,
      position: stage.position,
      choiceLabel: match?.label ?? null,
      tensionSide: match?.tensionSide ?? null,
      pressureType: stage.stage === "pressure" ? "LOYALTY" : null,
      costType: null,
      costLevel: null,
      costLabel: null,
      isLine: Boolean(stage.isLine),
    };
  }).filter((item) => item.choiceLabel != null);
}

export function buildTheBestTrajectory(input: {
  choices: TheBestRehearsalChoices;
  lineChoiceId: string | null;
}): ExperimentTrajectory | null {
  return buildExperimentTrajectory(buildTheBestTrajectoryInputs(input));
}

function trackable(side: TensionSide | null | undefined): side is "left" | "right" {
  return side === "left" || side === "right";
}

export function buildTheBestTodaysRead(input: {
  choices: TheBestRehearsalChoices;
  lineChoiceId: string | null;
}): TodaysRead {
  const trajectory = buildTheBestTrajectory(input);
  const lineCopy = theBestLineLabel(input.lineChoiceId);

  if (!trajectory) {
    return {
      headline: "YOUR CALLS ARE LOCKED IN.",
      bodyLines: [],
      lineCopy,
      switchCopy: null,
      tomorrowTease: null,
      isLegacy: false,
      isExperiment: true,
    };
  }

  const q3 = trajectory.stageChoices.find((row) => row.position === 3);
  const q4 = trajectory.stageChoices.find((row) => row.position === 4);
  const q3Side = q3?.side ?? null;
  const q4Side = q4?.side ?? null;

  if (trackable(q3Side) && trackable(q4Side) && q3Side === "left" && q4Side === "right") {
    return read("YOU WOULDN'T GIVE THE NAME.", ["YOU'D ASK FOR IT."], lineCopy);
  }

  if (trackable(q3Side) && trackable(q4Side) && q3Side === "right" && q4Side === "left") {
    return read("YOU'D GIVE THE NAME.", ["YOU WOULDN'T ASK FOR IT."], lineCopy);
  }

  if (trajectory.heldThroughout && trajectory.finalSide === "left") {
    return read("YOU KEPT THE EASIER ANSWER.", ["EVEN WHEN THEY ASKED FOR THE TRUTH."], lineCopy);
  }

  if (trajectory.heldThroughout && trajectory.finalSide === "right") {
    return read("YOU CHOSE THE TRUTH.", ["EVEN WHEN IT GOT PERSONAL."], lineCopy);
  }

  if (trajectory.movementCount > 1 || trajectory.returnedToOriginalPosition) {
    return read("YOU MOVED.", ["THEN DREW THE LINE SOMEWHERE ELSE."], lineCopy);
  }

  if (trajectory.firstMovementStage === "pressure" && trajectory.movementCount === 1) {
    return read(`"DON'T LIE TO ME" MOVED YOU.`, [], lineCopy);
  }

  if (trajectory.firstMovementStage === "consequence" && trajectory.movementCount === 1) {
    const q2 = trajectory.stageChoices.find((row) => row.position === 2);
    const q3Choice = trajectory.stageChoices.find((row) => row.position === 3);
    if (trackable(q2?.side) && trackable(q3Choice?.side) && q2.side === "right" && q3Choice.side === "left") {
      return read("THE TRUTH WAS EASY.", ["THE NAME WASN'T."], lineCopy);
    }
    if (trackable(q2?.side) && trackable(q3Choice?.side) && q2.side === "left" && q3Choice.side === "right") {
      return read("YOU KEPT THE LIE.", ["UNTIL THEY ASKED WHO."], lineCopy);
    }
  }

  if (trajectory.movementCount === 1) {
    return read("YOUR ANSWER MOVED AS THE CIRCUMSTANCES CHANGED.", [], lineCopy);
  }

  return read("YOUR CALLS ARE LOCKED IN.", [], lineCopy);
}

function read(headline: string, bodyLines: string[], lineCopy: string | null): TodaysRead {
  return {
    headline,
    bodyLines,
    lineCopy,
    switchCopy: null,
    tomorrowTease: null,
    isLegacy: false,
    isExperiment: true,
  };
}
