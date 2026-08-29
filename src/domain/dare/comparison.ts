import type { ExperimentStage } from "@/domain/daily/experiment";
import { priceStagePresentationLabel } from "@/domain/daily/price";
import type { DareStageChoice } from "@/domain/dare/types";

export type DareStageRow = {
  stageLabel: string;
  viewerChoice: string;
  otherChoice: string;
  agreed: boolean;
};

export type DareComparisonView = {
  headline: string;
  summary: string;
  movementCopy: string | null;
  stages: DareStageRow[];
  viewerLine: string | null;
  otherLine: string | null;
  agreementCount: number;
  totalComparable: number;
};

function stagePresentationLabel(stage: string, isLine: boolean): string {
  if (isLine) return "THE LINE";
  const normalized = stage as ExperimentStage;
  if (
    normalized === "instinct" ||
    normalized === "pressure" ||
    normalized === "consequence" ||
    normalized === "flip" ||
    normalized === "line"
  ) {
    return priceStagePresentationLabel(normalized);
  }
  return stage.toUpperCase();
}

function shortChoice(label: string, isLine: boolean): string {
  if (isLine) return label;
  const upper = label.toUpperCase();
  if (upper.length <= 24) return upper;
  return upper.slice(0, 22) + "…";
}

function trackableSide(side: string | null): side is "left" | "right" {
  return side === "left" || side === "right";
}

export function buildDareComparisonView(input: {
  viewerChoices: DareStageChoice[];
  otherChoices: DareStageChoice[];
  viewerLabel: string;
  otherLabel: string;
}): DareComparisonView {
  const viewerByPos = new Map(input.viewerChoices.map((row) => [row.position, row]));
  const otherByPos = new Map(input.otherChoices.map((row) => [row.position, row]));

  const stages: DareStageRow[] = [];
  let agreementCount = 0;
  let totalComparable = 0;

  for (const position of [1, 2, 3, 4]) {
    const viewer = viewerByPos.get(position);
    const other = otherByPos.get(position);
    if (!viewer || !other) continue;

    const agreed = viewer.choice_label === other.choice_label;
    if (agreed) agreementCount += 1;
    totalComparable += 1;

    stages.push({
      stageLabel: stagePresentationLabel(viewer.stage, viewer.is_line),
      viewerChoice: shortChoice(viewer.choice_label, viewer.is_line),
      otherChoice: shortChoice(other.choice_label, other.is_line),
      agreed,
    });
  }

  const viewerLine = viewerByPos.get(5)?.choice_label ?? null;
  const otherLine = otherByPos.get(5)?.choice_label ?? null;
  const linesMatch = viewerLine != null && otherLine != null && viewerLine === otherLine;

  const viewerBinary = input.viewerChoices.filter((row) => !row.is_line && trackableSide(row.tension_side));
  const otherBinary = input.otherChoices.filter((row) => !row.is_line && trackableSide(row.tension_side));

  let movementCopy: string | null = null;
  const viewerMoved = viewerBinary.some((row, index) => {
    if (index === 0) return false;
    const prior = viewerBinary[index - 1];
    return prior?.tension_side !== row.tension_side;
  });
  const otherMoved = otherBinary.some((row, index) => {
    if (index === 0) return false;
    const prior = otherBinary[index - 1];
    return prior?.tension_side !== row.tension_side;
  });

  const viewerMoveStage = viewerBinary.find((row, index) => {
    if (index === 0) return false;
    return viewerBinary[index - 1]?.tension_side !== row.tension_side;
  });
  const otherMoveStage = otherBinary.find((row, index) => {
    if (index === 0) return false;
    return otherBinary[index - 1]?.tension_side !== row.tension_side;
  });

  if (viewerMoved && !otherMoved) {
    const at = viewerMoveStage ? stagePresentationLabel(viewerMoveStage.stage, false) : "ONE STAGE";
    movementCopy = `YOU MOVED AT ${at}. ${input.otherLabel.toUpperCase()} NEVER MOVED.`;
  } else if (!viewerMoved && otherMoved) {
    const at = otherMoveStage ? stagePresentationLabel(otherMoveStage.stage, false) : "ONE STAGE";
    movementCopy = `${input.otherLabel.toUpperCase()} MOVED AT ${at}. YOU NEVER MOVED.`;
  } else if (viewerMoved && otherMoved && viewerMoveStage?.stage !== otherMoveStage?.stage) {
    movementCopy = "YOU BOTH MOVED — AT DIFFERENT MOMENTS.";
  } else if (!viewerMoved && !otherMoved && viewerBinary.length > 0) {
    movementCopy = "SAME START. SAME PATH.";
  } else if (viewerMoved && otherMoved) {
    movementCopy = "YOU BOTH MOVED.";
  }

  const headline = `YOU vs ${input.otherLabel.toUpperCase()}`;

  let summary: string;
  if (viewerLine && otherLine && !linesMatch) {
    summary = "YOU DREW DIFFERENT LINES.";
  } else if (linesMatch && totalComparable > 0) {
    summary = `YOU AGREED ON ${agreementCount} OF ${totalComparable} CALLS.`;
  } else if (totalComparable > 0) {
    summary = `YOU AGREED ON ${agreementCount} OF ${totalComparable} CALLS.`;
  } else {
    summary = "SAME SITUATION. DIFFERENT CALLS.";
  }

  return {
    headline,
    summary,
    movementCopy,
    stages,
    viewerLine,
    otherLine,
    agreementCount,
    totalComparable,
  };
}
