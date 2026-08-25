/**
 * Internal persistence may use claim_* column names for reveal-return events.
 * Consumer UX must always say "Reveal Streak".
 */
export const REVEAL_STREAK_UX_LABEL = "Reveal Streak";

export const REVEAL_STREAK_MILESTONES = [3, 7, 14, 30] as const;

export function isRevealStreakMilestone(current: number): boolean {
  return (REVEAL_STREAK_MILESTONES as readonly number[]).includes(current);
}
