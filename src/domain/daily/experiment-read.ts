import type { ExperimentStage } from "@/domain/daily/experiment";
import type { HumanTension } from "@/domain/daily/tension";
import type { ExperimentTrajectory } from "@/domain/daily/trajectory";

export type ExperimentTodaysRead = {
  headline: string;
  bodyLines: string[];
  lineCopy: string | null;
  switchCopy: null;
  tomorrowTease: string | null;
  isLegacy: false;
  isExperiment: true;
};

function formatPressurePhrase(pressureType: string | null): string | null {
  if (!pressureType?.trim()) {
    return null;
  }
  return pressureType.trim().replace(/_/g, " ");
}

function firstMoveHeadline(
  stage: ExperimentStage,
  pressureType: string | null,
): { headline: string; bodyLines: string[] } {
  const phrase = formatPressurePhrase(pressureType);

  switch (stage) {
    case "pressure":
      return {
        headline: phrase
          ? `YOU MOVED WHEN ${phrase.toUpperCase()} ENTERED THE PICTURE.`
          : "YOU MOVED WHEN THE CIRCUMSTANCES CHANGED.",
        bodyLines: [
          "You began on one side of the dilemma.",
          "When the circumstances changed, so did your answer.",
        ],
      };
    case "consequence":
      return {
        headline: "YOU HELD UNTIL OTHER PEOPLE HAD TO PAY THE PRICE.",
        bodyLines: ["The first thing that changed your call was collateral harm."],
      };
    case "flip":
      return {
        headline: "YOUR RULE HELD UNTIL YOU WERE ON THE OTHER SIDE OF IT.",
        bodyLines: ["Changing perspective was the first thing that moved your call."],
      };
    default:
      return {
        headline: "YOUR ANSWER MOVED AS THE CIRCUMSTANCES CHANGED.",
        bodyLines: ["That was the first condition that changed your call."],
      };
  }
}

export function buildExperimentTodaysRead(
  trajectory: ExperimentTrajectory,
  tomorrowTease: string | null,
): ExperimentTodaysRead {
  let headline: string;
  let bodyLines: string[];

  if (trajectory.heldThroughout) {
    headline = "YOU HELD THE SAME LINE FROM BOTH SIDES.";
    bodyLines = [
      "Remorse didn't move you.",
      "The cost of telling didn't move you.",
      "Changing perspective didn't move you.",
      "Your answer stayed on the same side throughout.",
    ];
  } else if (trajectory.returnedToOriginalPosition) {
    headline = "YOU CHANGED YOUR MIND. THEN CHANGED IT BACK.";
    bodyLines =
      trajectory.firstMovementStage === "pressure" &&
      trajectory.firstMovementPressureType?.toUpperCase() === "REMORSE"
        ? [
            "Remorse moved you first.",
            "Later circumstances pulled you back toward where you began.",
          ]
        : [
            "Your answer moved as the circumstances changed, but you ended where you began.",
          ];
  } else if (trajectory.movementCount > 1) {
    headline = "YOUR ANSWER MOVED MORE THAN ONCE.";
    bodyLines = [
      "Different circumstances pulled your decision in different directions.",
    ];
  } else if (trajectory.firstMovementStage) {
    ({ headline, bodyLines } = firstMoveHeadline(
      trajectory.firstMovementStage,
      trajectory.firstMovementPressureType,
    ));
  } else {
    headline = "YOUR CALLS ARE LOCKED IN.";
    bodyLines = [];
  }

  return {
    headline,
    bodyLines,
    lineCopy: trajectory.lineChoice,
    switchCopy: null,
    tomorrowTease,
    isLegacy: false,
    isExperiment: true,
  };
}

export function formatExperimentLineSection(lineChoice: string | null): string | null {
  if (!lineChoice) {
    return null;
  }
  return lineChoice;
}

export function sideLabelForTension(
  tension: HumanTension | null,
  side: "left" | "right" | null,
): string | null {
  if (!tension || !side) {
    return null;
  }
  return side === "left" ? tension.leftLabel : tension.rightLabel;
}
