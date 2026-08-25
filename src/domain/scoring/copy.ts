export function accuracyLabel(accuracy: number): string | null {
  if (accuracy >= 95) return "NAILED IT";
  if (accuracy >= 85) return "VERY CLOSE";
  if (accuracy >= 70) return "SOLID READ";
  return null;
}

export function crowdWinnerId(
  choices: readonly { id: string; votePct: number }[],
): string | null {
  if (choices.length === 0) {
    return null;
  }
  const max = Math.max(...choices.map((choice) => choice.votePct));
  if (max <= 0) {
    return null;
  }
  const winners = choices.filter((choice) => choice.votePct === max);
  return winners.length === 1 ? (winners[0]?.id ?? null) : null;
}

export function crowdAlignment(
  ownChoiceId: string,
  winnerId: string | null,
): "with" | "minority" | "split" {
  if (!winnerId) {
    return "split";
  }
  return ownChoiceId === winnerId ? "with" : "minority";
}

export function alignmentCopy(kind: "with" | "minority" | "split"): string | null {
  if (kind === "with") {
    return "You were with the crowd.";
  }
  if (kind === "minority") {
    return "You saw it differently.";
  }
  return null;
}

/** Deterministic reveal payoff — never interprets personality or correctness of opinion. */
export function revealContextCopy(input: {
  errorPoints: number | null;
  accuracy: number | null;
  alignment: "with" | "minority" | "split";
}): string | null {
  const { errorPoints, accuracy, alignment } = input;

  if (errorPoints != null && errorPoints >= 15) {
    return "The crowd surprised you.";
  }
  if (accuracy != null && accuracy < 70) {
    return "The crowd surprised you.";
  }
  if (errorPoints != null && errorPoints <= 5) {
    return "You read the room.";
  }
  if (accuracy != null && accuracy >= 85) {
    return "You read the room.";
  }
  if (alignment === "with") {
    return "You were with the crowd.";
  }
  if (alignment === "minority") {
    return "You saw it differently.";
  }
  return null;
}
