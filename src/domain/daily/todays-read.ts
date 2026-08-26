import type { HumanTension, TensionSide } from "@/domain/daily/tension";

export type TodaysReadQuestion = {
  position: number;
  question: string;
  choiceLabel: string | null;
  tensionSide: TensionSide | null;
  hasSwitch: boolean;
  switchStayed: boolean | null;
  isLine: boolean;
};

export type TodaysRead = {
  headline: string;
  bodyLines: string[];
  lineCopy: string | null;
  switchCopy: string | null;
  tomorrowTease: string | null;
  isLegacy: boolean;
};

type Lean = "left" | "right" | "split";

export function formatLineReadCopy(question: string, choiceLabel: string): string {
  const match = question.match(/\bbefore\b(.+?)\?\s*$/i);
  if (match?.[1]) {
    const tail = match[1].trim();
    return `${choiceLabel} before${tail.startsWith(" ") ? tail : ` ${tail}`}.`;
  }
  if (/when does/i.test(question)) {
    return choiceLabel;
  }
  return choiceLabel;
}

export function buildTodaysRead(
  questions: readonly TodaysReadQuestion[],
  tension: HumanTension | null,
  tomorrowTension: HumanTension | null,
): TodaysRead | null {
  const answered = questions.filter((item) => item.choiceLabel != null);
  if (answered.length === 0) {
    return null;
  }

  const sideQuestions = answered.filter(
    (item) => !item.isLine && item.tensionSide != null && item.tensionSide !== "neutral",
  );
  const switchQuestion = answered.find((item) => item.hasSwitch);
  const lineQuestion = answered.find((item) => item.isLine && item.choiceLabel);

  const lineCopy =
    lineQuestion?.choiceLabel != null
      ? formatLineReadCopy(lineQuestion.question, lineQuestion.choiceLabel)
      : null;

  const tomorrowTease = tomorrowTension?.displayLabel ?? null;

  if (!tension || sideQuestions.length === 0) {
    return {
      headline: legacyHeadline({
        hasSwitch: Boolean(switchQuestion),
        switchStayed: switchQuestion?.switchStayed ?? null,
        hasLine: lineCopy != null,
      }),
      bodyLines: legacyBodyLines(switchQuestion),
      lineCopy,
      switchCopy: null,
      tomorrowTease,
      isLegacy: true,
    };
  }

  const counts = countSides(sideQuestions);
  const lean = determineLean(counts);
  const headline = buildNarrativeHeadline({
    lean,
    tension,
    switchStayed: switchQuestion?.switchStayed ?? null,
    hasSwitch: Boolean(switchQuestion),
  });
  const bodyLines = buildBodyLines({ counts, tension, lean, switchQuestion });

  return {
    headline,
    bodyLines,
    lineCopy,
    switchCopy: null,
    tomorrowTease,
    isLegacy: false,
  };
}

function countSides(questions: readonly TodaysReadQuestion[]): { left: number; right: number } {
  let left = 0;
  let right = 0;
  for (const item of questions) {
    if (item.tensionSide === "left") left += 1;
    if (item.tensionSide === "right") right += 1;
  }
  return { left, right };
}

function determineLean(counts: { left: number; right: number }): Lean {
  if (counts.left > counts.right) return "left";
  if (counts.right > counts.left) return "right";
  return "split";
}

function labelForSide(tension: HumanTension, side: "left" | "right"): string {
  return side === "left" ? tension.leftLabel.toLowerCase() : tension.rightLabel.toLowerCase();
}

function buildNarrativeHeadline(input: {
  lean: Lean;
  tension: HumanTension;
  switchStayed: boolean | null;
  hasSwitch: boolean;
}): string {
  const left = labelForSide(input.tension, "left");
  const right = labelForSide(input.tension, "right");

  if (input.hasSwitch && input.switchStayed === false) {
    const favored = input.lean === "right" ? right : left;
    return `You chose ${favored} — until the cost changed your call.`;
  }

  if (input.hasSwitch && input.switchStayed === true) {
    const favored = input.lean === "right" ? right : left;
    return `You chose ${favored} — and held when the stakes changed.`;
  }

  if (input.lean === "left") {
    return `You chose ${left} today.`;
  }
  if (input.lean === "right") {
    return `You chose ${right} today.`;
  }
  return `You split today between ${left} and ${right}.`;
}

function buildBodyLines(input: {
  counts: { left: number; right: number };
  tension: HumanTension;
  lean: Lean;
  switchQuestion: TodaysReadQuestion | undefined;
}): string[] {
  const left = labelForSide(input.tension, "left");
  const right = labelForSide(input.tension, "right");
  const lines: string[] = [];

  if (input.lean === "left") {
    lines.push(`As today's dilemmas became more complicated, you still preferred ${left} over ${right}.`);
  } else if (input.lean === "right") {
    lines.push(`As today's dilemmas became more complicated, you still preferred ${right} over ${left}.`);
  } else {
    lines.push(`You weighed ${left} and ${right} differently across today's dilemmas.`);
  }

  if (input.switchQuestion?.switchStayed === true) {
    const favored = input.lean === "right" ? right : left;
    lines.push(`When the stakes shifted, you stayed with ${favored}.`);
  } else if (input.switchQuestion?.switchStayed === false) {
    const shiftedToward = input.lean === "right" ? left : right;
    lines.push(`When the consequence became permanent, you shifted toward ${shiftedToward}.`);
  }

  return lines;
}

function legacyHeadline(input: {
  hasSwitch: boolean;
  switchStayed: boolean | null;
  hasLine: boolean;
}): string {
  if (input.hasSwitch && input.switchStayed === false) {
    return "You shifted when the circumstances changed.";
  }
  if (input.hasSwitch && input.switchStayed === true) {
    return "You held your ground when the circumstances changed.";
  }
  if (input.hasLine) {
    return "You drew your line today.";
  }
  return "Your calls are locked in.";
}

function legacyBodyLines(switchQuestion: TodaysReadQuestion | undefined): string[] {
  if (!switchQuestion || switchQuestion.switchStayed == null) {
    return [];
  }
  if (switchQuestion.switchStayed) {
    return ["When the circumstances changed, you kept the same call."];
  }
  return ["When the consequence shifted, you changed your call."];
}
