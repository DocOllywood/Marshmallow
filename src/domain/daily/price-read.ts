import type { ExperimentTodaysRead } from "@/domain/daily/experiment-read";
import type { PriceTrajectory } from "@/domain/daily/price";
import { containsForbiddenPriceWording, isMonetaryCostLabel } from "@/domain/daily/price";

function costTypePhrase(costType: string | null): string {
  if (!costType?.trim()) {
    return "the cost";
  }
  const normalized = costType.trim().replace(/_/g, " ").toLowerCase();
  if (normalized === "money") {
    return "the offer";
  }
  if (normalized === "personal cost") {
    return "the personal cost";
  }
  if (normalized === "convenience") {
    return "the inconvenience";
  }
  return `the ${normalized}`;
}

function heldThroughoutBody(price: PriceTrajectory): string[] {
  const escalations = price.stageCosts.slice(1).map((stage) => costTypePhrase(stage.costType));
  const unique = [...new Set(escalations.filter(Boolean))];
  const lines: string[] = [];

  if (unique.length >= 2) {
    const first = unique[0]!;
    const second = unique[1]!;
    lines.push(`${first.charAt(0).toUpperCase()}${first.slice(1)} increased.`);
    lines.push(`Then ${second} increased.`);
  } else if (unique.length === 1) {
    const phrase = unique[0]!;
    lines.push(`${phrase.charAt(0).toUpperCase()}${phrase.slice(1)} increased.`);
  } else {
    lines.push("The cost of holding your position increased.");
  }

  lines.push("Your call stayed the same throughout this experiment.");
  return lines;
}

function monetaryMovementHeadlineAndBody(price: PriceTrajectory): {
  headline: string;
  bodyLines: string[];
} {
  const movementStage = price.stageCosts.find(
    (stage) => stage.stage === price.firstMovementStage,
  );
  const movementLabel = price.firstMovementCostLabel ?? movementStage?.costLabel;

  const priorStages = price.stageCosts.filter(
    (stage) =>
      stage.position < (movementStage?.position ?? Number.MAX_SAFE_INTEGER) &&
      stage.costLabel,
  );
  const priorLabel = priorStages.at(-1)?.costLabel;

  const headline = movementLabel
    ? `YOUR ANSWER MOVED AT ${movementLabel.toUpperCase()}.`
    : "YOUR ANSWER MOVED AS THE COST INCREASED.";

  const bodyLines: string[] = [];
  if (priorLabel && movementLabel) {
    bodyLines.push(`At ${priorLabel}, your call held.`);
    bodyLines.push(`At ${movementLabel}, it changed.`);
    bodyLines.push("Inside this hypothetical experiment, that was your line.");
  } else {
    bodyLines.push("Inside this hypothetical experiment, the cost crossed a point where your answer changed.");
  }

  return { headline, bodyLines };
}

export function buildPriceTodaysRead(
  price: PriceTrajectory,
  tomorrowTease: string | null,
): ExperimentTodaysRead {
  let headline: string;
  let bodyLines: string[];

  if (price.heldThroughout) {
    headline = "YOUR CALL HELD THROUGH EVERY PRICE WE TESTED.";
    bodyLines = heldThroughoutBody(price);
  } else if (price.returnedToOriginalPosition) {
    headline = "YOU MOVED, THEN RETURNED TO YOUR ORIGINAL CALL.";
    bodyLines = [
      "Inside this experiment, a higher cost moved your answer once.",
      "By the end, you were back where you started.",
    ];
  } else if (price.movementCount > 1) {
    headline = "THE PRICE DIDN'T MOVE YOU IN ONE DIRECTION.";
    bodyLines = [
      "Your answer changed more than once as different costs entered the scenario.",
    ];
  } else if (
    price.firstMovementStage &&
    isMonetaryCostLabel(price.firstMovementCostType, price.firstMovementCostLabel)
  ) {
    ({ headline, bodyLines } = monetaryMovementHeadlineAndBody(price));
  } else if (price.firstMovementStage) {
    headline = "THAT WAS YOUR TURNING POINT.";
    bodyLines = [
      "You held your original call until maintaining it carried a personal cost.",
      "Inside this experiment, that was the first condition that moved your answer.",
    ];
  } else {
    headline = "YOUR CALLS ARE LOCKED IN.";
    bodyLines = [];
  }

  const read: ExperimentTodaysRead & {
    isPrice: true;
    priceSections: {
      startedLabel: string | null;
      endedLabel: string | null;
      movedSummary: string | null;
    };
  } = {
    headline,
    bodyLines,
    lineCopy: price.lineChoice,
    switchCopy: null,
    tomorrowTease,
    isLegacy: false,
    isExperiment: true,
    isPrice: true,
    priceSections: {
      startedLabel: price.startingChoiceLabel,
      endedLabel: price.endingChoiceLabel,
      movedSummary: bodyLines[0] ?? null,
    },
  };

  const combined = [read.headline, ...read.bodyLines, read.lineCopy ?? ""].join(" ");
  if (containsForbiddenPriceWording(combined)) {
    throw new Error("Price Today's Read contains forbidden wording");
  }

  return read;
}
