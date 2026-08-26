/**
 * The Gap — intuitive prediction error presentation.
 * Separate from official Accuracy (Brier) and CrowdSense progression.
 */
export type GapResult = {
  gapPoints: number;
  predictedPct: number;
  crowdPct: number;
  tierCopy: string;
  directionCopy: string | null;
};

export function computeGap(predictedPct: number, crowdPct: number): GapResult {
  const gapPoints = Math.round(Math.abs(predictedPct - crowdPct));
  const tierCopy = gapTierCopy(gapPoints);
  const directionCopy =
    gapPoints <= 5
      ? null
      : predictedPct > crowdPct
        ? "You expected more Marshmallow players to agree with you."
        : predictedPct < crowdPct
          ? "You expected fewer Marshmallow players to agree with you."
          : null;

  return {
    gapPoints,
    predictedPct,
    crowdPct: Math.round(crowdPct),
    tierCopy,
    directionCopy,
  };
}

export function gapTierCopy(gapPoints: number): string {
  if (gapPoints <= 5) {
    return "YOU READ THE ROOM.";
  }
  if (gapPoints <= 15) {
    return "CLOSE READ.";
  }
  if (gapPoints <= 30) {
    return "THE CROWD LEANED DIFFERENTLY.";
  }
  return "YOU SAW THE CROWD VERY DIFFERENTLY.";
}
