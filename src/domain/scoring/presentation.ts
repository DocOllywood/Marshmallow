/**
 * Presentation helpers for reveal screens.
 *
 * Official accuracy is a 0–100 score derived from Brier scoring in a later
 * phase. Consumer UI must never mention Brier. When a single highlighted
 * choice is shown, percentage-point error is a readable companion, not the
 * official score.
 */
export type RevealSummary = {
  predictedPercent: number;
  crowdPercent: number;
  errorPoints: number;
  errorCopy: string;
};

export function formatRevealSummary(
  predictedPercent: number,
  crowdPercent: number,
): RevealSummary {
  const errorPoints = Math.abs(predictedPercent - crowdPercent);
  const errorCopy =
    errorPoints === 0
      ? "Exact call"
      : errorPoints === 1
        ? "Only 1 point off"
        : `Only ${errorPoints} points off`;

  return {
    predictedPercent,
    crowdPercent,
    errorPoints,
    errorCopy,
  };
}
