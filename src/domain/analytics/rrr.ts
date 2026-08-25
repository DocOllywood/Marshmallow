/**
 * Reveal Return Rate is server-authoritative.
 *
 * eligible = unique sealed entries on marshmallows with status = revealed
 *            (cancelled and never-finalized excluded)
 * opens    = those eligible entries with a reveal_opens row
 * RRR      = opens / eligible
 */
export function revealReturnRate(
  firstRevealOpens: number,
  eligibleSealedReveals: number,
): number | null {
  if (eligibleSealedReveals <= 0) {
    return null;
  }
  return firstRevealOpens / eligibleSealedReveals;
}
