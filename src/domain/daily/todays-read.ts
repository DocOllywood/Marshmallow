export type TodaysReadQuestion = {
  position: number;
  question: string;
  choiceLabel: string | null;
  hasSwitch: boolean;
  switchStayed: boolean | null;
  isLine: boolean;
};

export type TodaysRead = {
  headline: string;
  lineCopy: string | null;
  heldCount: number;
  shiftedCount: number;
};

export function formatLineReadCopy(question: string, choiceLabel: string): string {
  const match = question.match(/\bbefore\b(.+?)\?\s*$/i);
  if (match?.[1]) {
    const tail = match[1].trim();
    return `${choiceLabel} before${tail.startsWith(" ") ? tail : ` ${tail}`}.`;
  }
  return choiceLabel;
}

export function buildTodaysRead(questions: readonly TodaysReadQuestion[]): TodaysRead | null {
  const answered = questions.filter((item) => item.choiceLabel != null);
  if (answered.length === 0) {
    return null;
  }

  let heldCount = 0;
  let shiftedCount = 0;
  let hasSwitch = false;
  let lineCopy: string | null = null;

  for (const item of answered) {
    if (item.isLine && item.choiceLabel) {
      lineCopy = formatLineReadCopy(item.question, item.choiceLabel);
      heldCount += 1;
      continue;
    }

    if (item.hasSwitch) {
      hasSwitch = true;
      if (item.switchStayed === true) {
        heldCount += 1;
      } else if (item.switchStayed === false) {
        shiftedCount += 1;
      }
      continue;
    }

    heldCount += 1;
  }

  const headline = pickHeadline({ hasSwitch, shiftedCount, hasLine: lineCopy != null });

  return {
    headline,
    lineCopy,
    heldCount,
    shiftedCount,
  };
}

function pickHeadline(input: {
  hasSwitch: boolean;
  shiftedCount: number;
  hasLine: boolean;
}): string {
  if (input.hasSwitch && input.shiftedCount > 0) {
    return "You shifted when the circumstances changed.";
  }
  if (input.hasSwitch) {
    return "You held your ground when the circumstances changed.";
  }
  if (input.hasLine) {
    return "You drew your line today.";
  }
  return "Your calls are locked in.";
}
