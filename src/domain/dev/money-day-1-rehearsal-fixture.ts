import {
  LAUNCH_MONEY_DAILY_PRICE_REFERENCE_SIDE,
  LAUNCH_MONEY_DAILY_ROUND_ID,
  LAUNCH_MONEY_DAILY_TENSION_DISPLAY,
  LAUNCH_MONEY_DAILY_TITLE,
} from "@/domain/content/launch-money-daily";
import { buildExperimentCrowdTrajectory } from "@/domain/daily/crowd-trajectory";
import { buildUserPathPoints } from "@/domain/daily/experiment-play";
import { buildExperimentTrajectory } from "@/domain/daily/trajectory";
import type { TrajectoryInputStage } from "@/domain/daily/trajectory";
import { buildPriceCrowdHeldTrajectory, buildPriceTrajectory } from "@/domain/daily/price";
import { buildPriceTodaysRead } from "@/domain/daily/price-read";
import type { DailyRoundQuestionReveal, DailyRoundSummary } from "@/domain/daily/round";
import { dailyRoundSummary } from "@/domain/daily/round";
import { computeGap } from "@/domain/scoring/gap";
import { formatRevealSummary } from "@/domain/scoring/presentation";
import type { HumanTension } from "@/domain/daily/tension";
import type { LaunchMoneyDailyStageContent } from "@/domain/content/launch-money-daily";
import { LAUNCH_MONEY_DAILY_STAGES } from "@/domain/content/launch-money-daily";

export const MONEY_DAY1_REHEARSAL_STORAGE_KEY = "marshmallow-money-day-1-rehearsal";

export const MONEY_DAY1_REHEARSAL_TENSION: HumanTension = {
  id: "50000000-0000-4000-8000-000000000007",
  slug: "belonging-independence",
  leftLabel: "BELONGING",
  rightLabel: "INDEPENDENCE",
  displayLabel: LAUNCH_MONEY_DAILY_TENSION_DISPLAY,
};

/** Fixture crowd held % — rehearsal only, shows obvious movement at THE PRICE. */
export const MONEY_DAY1_REHEARSAL_CROWD_HELD = [
  { stage: "instinct" as const, position: 1, leftPct: 62, rightPct: 38, costLabel: "Before any offer details" },
  { stage: "pressure" as const, position: 2, leftPct: 58, rightPct: 42, costLabel: "Three months without work" },
  { stage: "consequence" as const, position: 3, leftPct: 41, rightPct: 59, costLabel: "$68,000 salary" },
  { stage: "flip" as const, position: 4, leftPct: 44, rightPct: 56, costLabel: null },
];

export type MoneyDay1RehearsalChoices = Record<number, string>;

export type MoneyDay1RehearsalPhase =
  | "intro"
  | "play"
  | "locked"
  | "flip-predict"
  | "line-locked"
  | "todays-read"
  | "outside"
  | "wait"
  | "reveal";

export type MoneyDay1RehearsalState = {
  phase: MoneyDay1RehearsalPhase;
  stageIndex: number;
  choices: MoneyDay1RehearsalChoices;
  flipPrediction: [number, number];
  lineChoiceId: string | null;
};

export function initialMoneyDay1RehearsalState(): MoneyDay1RehearsalState {
  return {
    phase: "intro",
    stageIndex: 0,
    choices: {},
    flipPrediction: [50, 50],
    lineChoiceId: null,
  };
}

export function currentRehearsalStage(state: MoneyDay1RehearsalState): LaunchMoneyDailyStageContent {
  return LAUNCH_MONEY_DAILY_STAGES[state.stageIndex] ?? LAUNCH_MONEY_DAILY_STAGES[0]!;
}

export function choiceSide(
  stage: LaunchMoneyDailyStageContent,
  choiceId: string,
): "left" | "right" | null {
  const match = stage.choices.find((choice) => choice.id === choiceId);
  return match?.tensionSide ?? null;
}

function rehearsalTrajectoryInputs(state: MoneyDay1RehearsalState): TrajectoryInputStage[] {
  return LAUNCH_MONEY_DAILY_STAGES.map((stage) => {
    const choiceId = stage.isLine ? state.lineChoiceId : state.choices[stage.position];
    const match = choiceId ? stage.choices.find((c) => c.id === choiceId) : null;
    return {
      stage: stage.stage,
      position: stage.position,
      choiceLabel: match?.label ?? null,
      tensionSide: match?.tensionSide ?? null,
      pressureType: stage.pressureType,
      costType: stage.costType,
      costLevel: stage.costType === "CAREER" ? 2 : stage.costType === "TIME" ? 1 : null,
      costLabel: stage.costLabel,
      isLine: stage.isLine,
    };
  }).filter((item) => item.choiceLabel != null);
}

export function buildRehearsalTodaysRead(state: MoneyDay1RehearsalState) {
  const trajectoryInputs = rehearsalTrajectoryInputs(state);
  const trajectory = buildExperimentTrajectory(trajectoryInputs);
  if (!trajectory) {
    return null;
  }
  const priceTrajectory = buildPriceTrajectory(trajectory, trajectoryInputs);
  return buildPriceTodaysRead(priceTrajectory, null);
}

export function buildRehearsalRevealPayload(state: MoneyDay1RehearsalState) {
  const crowdHeld = buildPriceCrowdHeldTrajectory({
    stages: MONEY_DAY1_REHEARSAL_CROWD_HELD,
    referenceSide: LAUNCH_MONEY_DAILY_PRICE_REFERENCE_SIDE,
  });

  const crowdTrajectory = buildExperimentCrowdTrajectory({
    stages: MONEY_DAY1_REHEARSAL_CROWD_HELD.map((row) => ({
      stage: row.stage,
      position: row.position,
      leftPct: row.leftPct,
      rightPct: row.rightPct,
    })),
    tension: MONEY_DAY1_REHEARSAL_TENSION,
    referenceSide: LAUNCH_MONEY_DAILY_PRICE_REFERENCE_SIDE,
  });

  const trajectoryInputs = rehearsalTrajectoryInputs(state);
  const userTrajectory = buildExperimentTrajectory(trajectoryInputs);
  const userPath = userTrajectory
    ? buildUserPathPoints(userTrajectory, MONEY_DAY1_REHEARSAL_TENSION)
    : [];

  const reveals: DailyRoundQuestionReveal[] = LAUNCH_MONEY_DAILY_STAGES.map((stage) => {
    const choiceId = stage.isLine ? state.lineChoiceId : state.choices[stage.position];
    const ownLabel = choiceId
      ? stage.choices.find((c) => c.id === choiceId)?.label ?? null
      : null;
    const crowdRow = MONEY_DAY1_REHEARSAL_CROWD_HELD.find((row) => row.position === stage.position);
    const crowdPct =
      stage.position <= 4 && crowdRow
        ? LAUNCH_MONEY_DAILY_PRICE_REFERENCE_SIDE === "left"
          ? crowdRow.leftPct
          : crowdRow.rightPct
        : 0;
    const predictedPct = stage.position === 4 ? state.flipPrediction[0] : null;
    const revealMath =
      predictedPct != null ? formatRevealSummary(predictedPct, crowdPct) : null;

    return {
      id: stage.marshmallowId,
      question: stage.question,
      position: stage.position,
      isLine: stage.isLine,
      ownChoiceLabel: ownLabel,
      predictedPct,
      crowdPct,
      crowdLabel:
        LAUNCH_MONEY_DAILY_PRICE_REFERENCE_SIDE === "left"
          ? MONEY_DAY1_REHEARSAL_TENSION.leftLabel
          : MONEY_DAY1_REHEARSAL_TENSION.rightLabel,
      crowdModeLabel: null,
      errorCopy: revealMath?.errorCopy ?? null,
      accuracy: stage.position === 4 ? 72 : null,
      gap: predictedPct != null ? computeGap(predictedPct, crowdPct) : null,
    };
  });

  const summary: DailyRoundSummary = dailyRoundSummary(reveals, 68, null, {
    isExperimentDaily: true,
  });

  return {
    roundId: LAUNCH_MONEY_DAILY_ROUND_ID,
    title: LAUNCH_MONEY_DAILY_TITLE,
    reveals,
    summary,
    crowdTrajectory,
    priceCrowdHeldTrajectory: crowdHeld,
    userPath,
  };
}
