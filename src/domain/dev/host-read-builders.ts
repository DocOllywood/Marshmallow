import type { TensionSide } from "@/domain/daily/tension";
import type { TodaysRead } from "@/domain/daily/todays-read";
import {
  buildExperimentTrajectory,
  type TrajectoryInputStage,
} from "@/domain/daily/trajectory";

import {
  hostLineLabel,
  hostQuietFallbackRead,
  type HostContentStage,
  type HostPlayChoices,
} from "@/domain/dev/host-rehearsal-types";

function trackable(side: TensionSide | null | undefined): side is "left" | "right" {
  return side === "left" || side === "right";
}

export function buildHostTrajectoryInputs(
  stages: readonly HostContentStage[],
  input: { choices: HostPlayChoices; lineChoiceId: string | null },
): TrajectoryInputStage[] {
  return stages
    .map((stage) => {
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
    })
    .filter((item) => item.choiceLabel != null);
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

export function buildTrajectoryHostRead(
  stages: readonly HostContentStage[],
  input: { choices: HostPlayChoices; lineChoiceId: string | null },
  rules: {
    q3q4Inverse?: { leftRight: [string, string]; rightLeft: [string, string] };
    heldLeft?: [string, string];
    heldRight?: [string, string];
    multiMove?: [string, string];
    firstMovePressure?: string;
    firstMoveConsequence?: Array<{ when: (q2: TensionSide | null, q3: TensionSide | null) => boolean; read: [string, string?] }>;
    firstMoveSingle?: string;
    custom?: (trajectory: ReturnType<typeof buildExperimentTrajectory>, lineCopy: string | null) => TodaysRead | null;
    fallbackHeadline?: string;
  },
): TodaysRead {
  const lineCopy = hostLineLabel(stages, input.lineChoiceId);
  const trajectory = buildExperimentTrajectory(buildHostTrajectoryInputs(stages, input));

  if (!trajectory) {
    return hostQuietFallbackRead(lineCopy, rules.fallbackHeadline);
  }

  const custom = rules.custom?.(trajectory, lineCopy);
  if (custom) return custom;

  const q3 = trajectory.stageChoices.find((row) => row.position === 3);
  const q4 = trajectory.stageChoices.find((row) => row.position === 4);
  const q3Side = q3?.side ?? null;
  const q4Side = q4?.side ?? null;

  if (rules.q3q4Inverse && trackable(q3Side) && trackable(q4Side)) {
    if (q3Side === "left" && q4Side === "right") {
      return read(rules.q3q4Inverse.leftRight[0], [rules.q3q4Inverse.leftRight[1]], lineCopy);
    }
    if (q3Side === "right" && q4Side === "left") {
      return read(rules.q3q4Inverse.rightLeft[0], [rules.q3q4Inverse.rightLeft[1]], lineCopy);
    }
  }

  if (rules.heldLeft && trajectory.heldThroughout && trajectory.finalSide === "left") {
    return read(rules.heldLeft[0], [rules.heldLeft[1]], lineCopy);
  }

  if (rules.heldRight && trajectory.heldThroughout && trajectory.finalSide === "right") {
    return read(rules.heldRight[0], [rules.heldRight[1]], lineCopy);
  }

  if (rules.multiMove && (trajectory.movementCount > 1 || trajectory.returnedToOriginalPosition)) {
    return read(rules.multiMove[0], [rules.multiMove[1]], lineCopy);
  }

  if (rules.firstMovePressure && trajectory.firstMovementStage === "pressure" && trajectory.movementCount === 1) {
    return read(rules.firstMovePressure, [], lineCopy);
  }

  if (rules.firstMoveConsequence && trajectory.firstMovementStage === "consequence" && trajectory.movementCount === 1) {
    const q2 = trajectory.stageChoices.find((row) => row.position === 2);
    const q3Choice = trajectory.stageChoices.find((row) => row.position === 3);
    for (const rule of rules.firstMoveConsequence) {
      if (rule.when(q2?.side ?? null, q3Choice?.side ?? null)) {
        return read(rule.read[0], rule.read[1] ? [rule.read[1]] : [], lineCopy);
      }
    }
  }

  if (rules.firstMoveSingle && trajectory.movementCount === 1) {
    return read(rules.firstMoveSingle, [], lineCopy);
  }

  return hostQuietFallbackRead(lineCopy, rules.fallbackHeadline);
}
