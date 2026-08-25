/**
 * Reputation rules:
 * - Official accuracy is permanent.
 * - Base points from that accuracy are permanent and never expire.
 * - Returning promptly may add a separate Reveal Bonus.
 * - Missing the bonus window does not confiscate base points.
 *
 * Reveal Bonus rounding (deterministic, matches Postgres ROUND(numeric, 0)):
 *   LEAST(10, ROUND(base_points * 0.1, 0))
 * Half away from zero for positive values (4.5 → 5, 4.7 → 5, 4.4 → 4).
 * Integer reputation model: bonus is stored as an integer.
 */
export const REVEAL_BONUS_WINDOW_HOURS = 24;
export const REVEAL_BONUS_RATE = 0.1;
export const REVEAL_BONUS_CAP = 10;

export type PointAward = {
  /** Permanent. Awarded when the marshmallow reveals. */
  basePoints: number;
  /** Optional. Awarded only if the user opens the reveal within the bonus window. */
  revealBonusPoints: number;
};

export function revealBonusPoints(basePoints: number): number {
  if (!Number.isInteger(basePoints) || basePoints < 0) {
    throw new Error("basePoints must be a non-negative integer");
  }

  const rounded = Math.round(basePoints * REVEAL_BONUS_RATE);
  return Math.min(REVEAL_BONUS_CAP, rounded);
}

export function totalVisiblePoints(award: PointAward): number {
  return award.basePoints + award.revealBonusPoints;
}
