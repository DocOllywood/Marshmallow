export function predictionSummary(
  choiceLabel: string | null,
  predictedPct: number | null,
): string | null {
  if (!choiceLabel || predictedPct == null) {
    return null;
  }
  return `${choiceLabel} ${predictedPct}%`;
}
