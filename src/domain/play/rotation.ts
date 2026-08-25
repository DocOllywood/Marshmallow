export const PROMOTED_QUICK_TARGET = 3;

/** Priority > 0 is promoted. NULL is eligible for auto-fill. 0 is an explicit hold. */
export function isPromotedQuick(priority: number | null | undefined): boolean {
  return (priority ?? 0) > 0;
}

export function compareQuickPriority(
  a: { quick_priority?: number | null },
  b: { quick_priority?: number | null },
): number {
  const left = isPromotedQuick(a.quick_priority) ? (a.quick_priority ?? 99) : 99;
  const right = isPromotedQuick(b.quick_priority) ? (b.quick_priority ?? 99) : 99;
  if (left !== right) return left - right;
  return 0;
}
