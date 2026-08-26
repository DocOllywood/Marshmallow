/** Standalone Home inventory excludes every marshmallow tied to a Daily round. */
export function isStandaloneHomeInventory(dailyRoundId: string | null | undefined): boolean {
  return dailyRoundId == null;
}
